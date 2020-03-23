import { Observable } from 'tns-core-modules/data/observable';
import { knownFolders, path } from 'tns-core-modules/file-system';
import { isString } from 'tns-core-modules/utils/types';
import { NS_AUDIO_LOGGER, NS_AUDIO_UTIL, NSAudioPlayer as PlayerInterface } from '../common';
import { AudioPlayerEvent, AudioPlayerOptions } from '../options';

export class NSAudioPlayer extends NSObject implements PlayerInterface {
  private _player: AVPlayer;
  private _events: Observable;

  private readonly log: NS_AUDIO_LOGGER;

  constructor() {
    super();

    this.log = new NS_AUDIO_LOGGER('ios');
  }

  /**
   * Status Observer is for watching the status of the AVPlayerItem to know if playback is ready or not.
   */
  private _statusObserver;
  private _statusObserverActive: boolean;

  get events() {
    if (!this._events) {
      this._events = new Observable();
    }

    return this._events;
  }

  get ios(): any {
    return this._player;
  }

  set debug(value: boolean) {
    NS_AUDIO_UTIL.debug = value;
  }

  get volume(): number {
    return this._player ? this._player.volume : 0;
  }

  set volume(value: number) {
    if (this._player && value >= 0) {
      this._player.volume = value;
    }
  }

  get duration() {
    if (this._player && this._player.currentItem) {
      const seconds = CMTimeGetSeconds(this._player.currentItem.asset.duration);

      return seconds * 1000.0;
    }

    return 0;
  }

  get currentTime(): number {
    if (this._player && this._player.currentItem) {
      const currentTime = this._player.currentTime();

      return ((currentTime.value / currentTime.timescale) * 1000);
    }

    return 0;
  }

  async initFromFile(options: AudioPlayerOptions): Promise<any> {
    // init only
    options.autoPlay = false;

    return this.playFromFile(options);
  }

  async playFromFile(options: AudioPlayerOptions): Promise<any> {
    this._statusObserver = PlayerObserverClass.alloc();
    this._statusObserver['_owner'] = this;

    let fileName = isString(options.audioFile) ? options.audioFile.trim() : '';

    if (fileName.indexOf('~/') === 0) {
      fileName = path.join(
        knownFolders.currentApp().path,
        fileName.replace('~/', ''),
      );
    }

    this.log.info(`playFromFile: filename ${fileName}`);

    this._setIOSAudioSessionOutput();
    this._setupPlayerItem(fileName, true);

    if (options.loop) {
      // Invoke after player is created and AVPlayerItem is specified
      NSNotificationCenter.defaultCenter.addObserverSelectorNameObject(
        this,
        'playerItemDidReachEnd',
        AVPlayerItemDidPlayToEndTimeNotification,
        this._player.currentItem,
      );
    }

    if (options.autoPlay) {
      this._player.play();
    }
  }

  playerItemDidReachEnd() {
    if (this._player) {
      this._player.seekToTime(kCMTimeZero);
      this._player.play();
    }
  }

  async initFromUrl(options: AudioPlayerOptions): Promise<any> {
    options.autoPlay = false;

    return this.playFromUrl(options);
  }

  async playFromUrl(options: AudioPlayerOptions) {
    this._statusObserver = PlayerObserverClass.alloc();
    this._statusObserver['_owner'] = this;

    this._setIOSAudioSessionOutput();
    this._setupPlayerItem(options.audioFile, false);
  }

  async pause(): Promise<boolean> {
    if (!this._player) {
      throw new Error('Player not initialized.');
    }

    try {
      if (this._player && this._player.timeControlStatus === AVPlayerTimeControlStatus.Playing) {
        this.log.info('pause(): pausing player');
        this._player.pause();
        this._sendEvent(AudioPlayerEvent.PAUSED);

        return true;
      }
    } catch (e) {
      this.log.error('pause(): error', e);

      throw e;
    }
  }

  async play(): Promise<boolean> {
    try {
      if (!this.isAudioPlaying()) {

        this.log.info('play(): changed state from paused to playing');

        this._player.play();

        return true;
      }
    } catch (e) {
      this.log.error('play(): threw an exception', e);
      throw e;
    }
  }

  resume(): void {
    if (this._player && this._player.currentItem) {
      this.log.info('resume(): called');
      this._player.play();
    }
  }

  playAtTime(time: number): void {
    if (this._player && this._player.currentItem) {
      this.log.info('playAtTime()', time);

      this._player.seekToTime(CMTimeMakeWithSeconds(time, 1000));
    }
  }

  async seekTo(time: number): Promise<boolean> {
    const currentItem = this._player.currentItem;

    if (!currentItem) {
      this.log.error('seekTo(): player does not have an item', {
        platform: 'ios',
      });

      return false;
    }

    const readyToPlay = currentItem.status === AVPlayerItemStatus.ReadyToPlay;
    if (!readyToPlay) {
      this.log.error('seekTo(): item was not ready to play');

      return false;
    }

    try {
      this._player.seekToTime(CMTimeMakeWithSeconds(time, 1000));
      this._sendEvent(AudioPlayerEvent.SEEK);
      this.log.info(`seekTo(): seeked to ${time}`);
    } catch (e) {
      this.log.error('seekTo(): an exception', e);
      throw e;
    }

    return true;
  }

  async dispose(): Promise<any> {
    try {
      this.log.info('disposing player');

      if (this._player) {
        // remove the status observer from the AVPlayerItem
        if (this._player.currentItem) {
          this._removeStatusObserver(this._player.currentItem);
        }

        this._player.pause();
        this._player.replaceCurrentItemWithPlayerItem(null); // de-allocates the AVPlayer
        this._player = null;
      }

      return true;
    } catch (e) {
      this.log.error('dispose(): threw an exception', e);
      throw e;
    }
  }

  isAudioPlaying(): boolean {
    return this._player &&
      this._player.timeControlStatus === AVPlayerTimeControlStatus.Playing;
  }

  async getAudioTrackDuration(): Promise<string> {
    try {
      const seconds = CMTimeGetSeconds(this._player.currentItem.asset.duration);
      const milliseconds = seconds * 1000.0;

      this.log.info('audio track duration', milliseconds);

      return milliseconds.toString();
    } catch (e) {
      this.log.error('getAudioTrackDuration error', e);
      throw e;
    }
  }

  changePlayerSpeed(speed) {
    if (this._player && speed) {
      // make sure speed is a number/float
      if (typeof speed === 'string') {
        speed = parseFloat(speed);
      }
      this._player.rate = speed;
    }
  }

  //  audioPlayerDidFinishPlayingSuccessfully(player?: any, flag?: boolean) {
  //   if (flag && this._completeCallback) {
  //     this._completeCallback({ player, flag });
  //   } else if (!flag && this._errorCallback) {
  //     this._errorCallback({ player, flag });
  //   }
  // }

  //  audioPlayerDecodeErrorDidOccurError(player: any, error: NSError) {
  //   if (this._errorCallback) {
  //     this._errorCallback({ player, error });
  //   }
  // }

  /**
   * Notify events by name and optionally pass data
   */
  _sendEvent(eventName: string, data?: any) {
    if (this.events) {
      this.events.notify(<any> {
        eventName,
        object: this,
        data: data,
      });
    }
  }

  private _setupPlayerItem(audioUrl, isLocalFile: boolean) {
    let url;
    if (isLocalFile) {
      url = NSURL.fileURLWithPath(audioUrl);
    } else {
      url = NSURL.URLWithString(audioUrl);
    }

    const avAsset = AVURLAsset.URLAssetWithURLOptions(url, null);
    const playerItem = AVPlayerItem.playerItemWithAsset(avAsset);

    // replace the current AVPlayerItem if the player already exists
    if (this._player && this._player.currentItem) {
      this._player.replaceCurrentItemWithPlayerItem(playerItem);
    } else {
      this._player = AVPlayer.playerWithPlayerItem(playerItem);
      // @link - https://stackoverflow.com/a/42628097/1893557
      this._player.automaticallyWaitsToMinimizeStalling = false;
    }

    // setup the status observer for the AVPlayerItem
    this._addStatusObserver(playerItem);
  }

  private _setIOSAudioSessionOutput() {
    const audioSession = AVAudioSession.sharedInstance();
    const output = audioSession.currentRoute.outputs.lastObject.portType;
    this.log.info('IOSAudioSessionOutput', output);

    if (output.match(/Receiver/)) {
      try {
        audioSession.setCategoryError(AVAudioSessionCategoryPlayAndRecord);
        audioSession.overrideOutputAudioPortError(
          AVAudioSessionPortOverride.Speaker,
        );
        audioSession.setActiveError(true);
        this.log.info('audioSession category set and active');
      } catch (e) {
        this.log.error('setting audioSession category failed', e);
        throw e;
      }
    }
  }

  private _addStatusObserver(currentItem: AVPlayerItem) {
    this._statusObserverActive = true;
    currentItem.addObserverForKeyPathOptionsContext(
      this._statusObserver,
      'status',
      0,
      null,
    );
  }

  private _removeStatusObserver(currentItem: AVPlayerItem) {
    // If the observer is active, then we need to remove it...
    if (!this._statusObserverActive) {
      return;
    }

    this._statusObserverActive = false;
    if (currentItem) {
      currentItem.removeObserverForKeyPath(this._statusObserver, 'status');
    }
  }
}

class PlayerObserverClass extends NSObject {
  observeValueForKeyPathOfObjectChangeContext(
    path: string,
    obj: Object,
    change: NSDictionary<any, any>,
    context: any,
  ) {
    if (path === 'status') {
      if (this['_owner']._player.currentItem.status === AVPlayerItemStatus.ReadyToPlay) {
        // send the ready event
        this['_owner']._sendEvent(AudioPlayerEvent.READY);
        // if playing url, we need to call play here
        this['_owner']._player.play();
      }
    }
  }
}
