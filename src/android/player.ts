import * as app from 'tns-core-modules/application';
import { Observable } from 'tns-core-modules/data/observable';
import { isFileOrResourcePath } from 'tns-core-modules/utils/utils';
import { NS_AUDIO_LOGGER, NS_AUDIO_UTIL, NSAudioPlayer as PlayerInterface, resolveAudioFilePath } from '../common';
import { AudioPlayerEvent, AudioPlayerOptions } from '../options';

export class NSAudioPlayer implements PlayerInterface {
  private _player: android.media.MediaPlayer;
  private _mAudioFocusGranted: boolean = false;
  private _lastPlayerVolume; // ref to the last volume setting so we can reset after ducking
  private _events: Observable;
  private readonly log: NS_AUDIO_LOGGER;

  constructor() {
    this.log = new NS_AUDIO_LOGGER('android');

    // request audio focus, this will setup the onAudioFocusChangeListener
    this._mAudioFocusGranted = this._requestAudioFocus();
    this.log.info('_mAudioFocusGranted', this._mAudioFocusGranted);
  }

  get events() {
    if (!this._events) {
      this._events = new Observable();
    }

    return this._events;
  }

  get android(): any {
    return this._player;
  }

  set debug(value: boolean) {
    NS_AUDIO_UTIL.debug = value;
  }

  get volume(): number {
    // TODO: find better way to get individual player volume
    const ctx = this._getAndroidContext();
    const mgr = ctx.getSystemService(android.content.Context.AUDIO_SERVICE);

    return mgr.getStreamVolume(android.media.AudioManager.STREAM_MUSIC);
  }

  set volume(value: number) {
    if (this._player && value >= 0) {
      this._player.setVolume(value, value);
    }
  }

  get duration(): number {
    if (this._player) {
      return this._player.getDuration();
    }

    return 0;
  }

  get currentTime(): number {
    return this._player ? this._player.getCurrentPosition() : 0;
  }

  /**
   * Initializes the player with options, will not start playing audio.
   * @param options [AudioPlayerOptions]
   */
  initFromFile(options: AudioPlayerOptions): Promise<any> {
    options.autoPlay = false;

    return this.playFromFile(options);
  }

  playFromFile(options: AudioPlayerOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (options.autoPlay !== false) {
          options.autoPlay = true;
        }

        const audioPath = resolveAudioFilePath(options.audioFile);
        this.log.info('audioPath', audioPath);

        if (!this._player) {
          this.log.info(
            'android mediaPlayer is not initialized, creating new instance'
          );
          this._player = new android.media.MediaPlayer();
        }

        // request audio focus, this will setup the onAudioFocusChangeListener
        this._mAudioFocusGranted = this._requestAudioFocus();
        this.log.info('_mAudioFocusGranted', this._mAudioFocusGranted);

        this._player.setAudioStreamType(
          android.media.AudioManager.STREAM_MUSIC
        );

        this.log.info('resetting mediaPlayer...');
        this._player.reset();
        this.log.info('setting datasource', audioPath);
        this._player.setDataSource(audioPath);

        // check if local file or remote - local then `prepare` is okay https://developer.android.com/reference/android/media/MediaPlayer.html#prepare()
        if (isFileOrResourcePath(audioPath)) {
          this.log.info('preparing mediaPlayer...');
          this._player.prepare();
        } else {
          this.log.info('preparing mediaPlayer async...');
          this._player.prepareAsync();
        }

        // On Complete
        if (options.completeCallback) {
          this._player.setOnCompletionListener(
            new android.media.MediaPlayer.OnCompletionListener({
              onCompletion: mp => {
                if (options.loop === true) {
                  mp.seekTo(5);
                  mp.start();
                }

                options.completeCallback({ player: mp });
              }
            })
          );
        }

        // On Error
        if (options.errorCallback) {
          this._player.setOnErrorListener(
            new android.media.MediaPlayer.OnErrorListener({
              onError: (player: any, error: number, extra: number) => {
                this._player.reset();
                this.log.error('errorCallback', error);
                options.errorCallback({ player, error, extra });

                return true;
              }
            })
          );
        }

        // On Info
        if (options.infoCallback) {
          this._player.setOnInfoListener(
            new android.media.MediaPlayer.OnInfoListener({
              onInfo: (player: any, info: number, extra: number) => {
                this.log.info('infoCallback', info);
                options.infoCallback({ player, info, extra });

                return true;
              }
            })
          );
        }

        // On Prepared
        this._player.setOnPreparedListener(
          new android.media.MediaPlayer.OnPreparedListener({
            onPrepared: mp => {
              this.log.info({mp});
              if (options.autoPlay) {
                this.log.info('options.autoPlay', options.autoPlay);
                this.play();
              }
              resolve();
            }
          })
        );
      } catch (e) {
        this.log.error('playFromFile error', e);
        reject(e);
      }
    });
  }

  /**
   * Initializes the player with options, will not start playing audio.
   */
  initFromUrl(options: AudioPlayerOptions): Promise<any> {
    options.autoPlay = false;

    return this.playFromUrl(options);
  }

  playFromUrl(options: AudioPlayerOptions): Promise<any> {
    return this.playFromFile(options);
  }

  pause(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (this._player && this._player.isPlaying()) {
          this.log.info('pausing player');
          this._player.pause();
          this._sendEvent(AudioPlayerEvent.PAUSED);
        }
        resolve(true);
      } catch (e) {
        this.log.error('pause error', e);
        reject(e);
      }
    });
  }

  play(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (this._player && !this._player.isPlaying()) {
          this._sendEvent(AudioPlayerEvent.STARTED);
          // set volume controls
          // https://developer.android.com/reference/android/app/Activity.html#setVolumeControlStream(int)
          app.android.foregroundActivity.setVolumeControlStream(android.media.AudioManager.STREAM_MUSIC);

          // register the receiver so when calls or another app takes main audio focus the player pauses
          app.android.registerBroadcastReceiver(
            android.media.AudioManager.ACTION_AUDIO_BECOMING_NOISY,
            (context: android.content.Context, intent: android.content.Intent) => {
              this.log.info('ACTION_AUDIO_BECOMING_NOISY onReceiveCallback');
              this.log.info('intent', intent);
              this.pause();
            }
          );

          this._player.start();
        }
        resolve(true);
      } catch (e) {
        this.log.error('Error trying to play audio.', e);
        reject(e);
      }
    });
  }

  resume(): void {
    if (this._player) {
      this.log.info('resume');
      this._player.start();
      this._sendEvent(AudioPlayerEvent.PAUSED);
    }
  }

  seekTo(time: number): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (this._player) {
          time = time * 1000;
          this.log.info('seekTo seconds', time);
          this._player.seekTo(time);
          this._sendEvent(AudioPlayerEvent.SEEK);
        }
        resolve(true);
      } catch (e) {
        this.log.error('seekTo error', e);
        reject(e);
      }
    });
  }

  changePlayerSpeed(speed) {
    // this checks on API 23 and up
    if (android.os.Build.VERSION.SDK_INT >= 23 && this.play) {
      this.log.info('setting the mediaPlayer playback speed', speed);
      if (this._player.isPlaying()) {
        (this._player as any).setPlaybackParams((this._player as any).getPlaybackParams()
          .setSpeed(speed));
      } else {
        (this._player as any).setPlaybackParams((this._player as any).getPlaybackParams()
          .setSpeed(speed));
        this._player.pause();
      }
    } else {
      throw new Error('Android device API is not 23+. Cannot set the playbackRate on lower Android APIs.');
    }
  }

  dispose(): Promise<any> {
    if (!this._player) {
      return;
    }

    try {
      this.log.info('disposing of mediaPlayer instance', this._player);
      this._player.stop();
      this._player.reset();
      // this._player.release();

      this.log.info('unregisterBroadcastReceiver ACTION_AUDIO_BECOMING_NOISY...');
      // unregister broadcast receiver
      app.android.unregisterBroadcastReceiver(android.media.AudioManager.ACTION_AUDIO_BECOMING_NOISY);

      this.log.info('abandoning audio focus...');
      this._abandonAudioFocus();

      return;
    } catch (e) {
      this.log.error('dispose error', e);
      throw e;
    }
  }

  isAudioPlaying(): boolean {
    if (this._player) {
      return this._player.isPlaying();
    } else {
      return false;
    }
  }

  getAudioTrackDuration(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const duration = this._player ? this._player.getDuration() : 0;
        this.log.info('audio track duration', duration);
        resolve(duration.toString());
      } catch (e) {
        this.log.error('getAudioTrackDuration error', e);
        reject(e);
      }
    });
  }

  /**
   * Notify events by name and optionally pass data
   */
  private _sendEvent(eventName: string, data?: any) {
    if (this.events) {
      this.events.notify(<any> {
        eventName,
        object: this,
        data: data
      });
    }
  }

  /**
   * Helper method to ensure audio focus.
   */
  private _requestAudioFocus(): boolean {
    let result = false;
    if (!this._mAudioFocusGranted) {
      const ctx = this._getAndroidContext();
      const am = ctx.getSystemService(android.content.Context.AUDIO_SERVICE);
      // Request audio focus for play back
      const focusResult = am.requestAudioFocus(
        this._mOnAudioFocusChangeListener,
        android.media.AudioManager.STREAM_MUSIC,
        android.media.AudioManager.AUDIOFOCUS_GAIN
      );

      if (focusResult === android.media.AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
        result = true;
      } else {
        this.log.error('Failed to get audio focus.');
        result = false;
      }
    }

    return result;
  }

  private _abandonAudioFocus(): void {
    const ctx = this._getAndroidContext();
    const am = ctx.getSystemService(android.content.Context.AUDIO_SERVICE);
    const result = am.abandonAudioFocus(this._mOnAudioFocusChangeListener);

    if (result === android.media.AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
      this._mAudioFocusGranted = false;
    } else {
      this.log.error('Failed to abandon audio focus.');
    }
    this._mOnAudioFocusChangeListener = null;
  }

  private _getAndroidContext() {
    let ctx = app.android.context;
    if (!ctx) {
      ctx = app.getNativeApplication()
        .getApplicationContext();
    }

    if (ctx === null) {
      setTimeout(() => {
        this._getAndroidContext();
      }, 200);

      return;
    }

    return ctx;
  }

  private _mOnAudioFocusChangeListener = new android.media.AudioManager.OnAudioFocusChangeListener({
    onAudioFocusChange: (focusChange: number) => {
      switch (focusChange) {
        case android.media.AudioManager.AUDIOFOCUS_GAIN:
          this.log.info('AUDIOFOCUS_GAIN');
          // Set volume level to desired levels
          this.log.info('this._lastPlayerVolume', this._lastPlayerVolume);
          // if last volume more than 10 just set to 1.0 float
          if (this._lastPlayerVolume && this._lastPlayerVolume >= 10) {
            this.volume = 1.0;
          } else if (this._lastPlayerVolume) {
            this.volume = parseFloat('0.' + this._lastPlayerVolume.toString());
          }

          this.resume();
          break;
        case android.media.AudioManager.AUDIOFOCUS_GAIN_TRANSIENT:
          this.log.info('AUDIOFOCUS_GAIN_TRANSIENT');
          // You have audio focus for a short time
          break;
        case android.media.AudioManager.AUDIOFOCUS_LOSS:
          this.log.info('AUDIOFOCUS_LOSS');
          this.pause();
          break;
        case android.media.AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
          this.log.info('AUDIOFOCUS_LOSS_TRANSIENT');
          // Temporary loss of audio focus - expect to get it back - you can keep your resources around
          this.pause();
          break;
        case android.media.AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
          this.log.info('AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK');
          // Lower the volume, keep playing
          this._lastPlayerVolume = this.volume;
          this.log.info('this._lastPlayerVolume', this._lastPlayerVolume);
          this.volume = 0.2;
          break;
      }
    }
  });
}
