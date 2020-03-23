import { Observable } from 'tns-core-modules/data/observable';

export interface AudioPlayerOptions {
  /**
   * The audio file to play.
   */
  audioFile: string;

  /**
   * Set true to loop audio playback.
   */
  loop: boolean;

  /**
   * Prevent autoplay if desired as player autoplays be default
   */
  autoPlay?: boolean;

  /**
   * Set true to enable audio metering.
   */
  metering?: boolean;

  /**
   * Callback to execute when playback has completed.
   * @returns An object containing the native values for the callback.
   */
  completeCallback?: Function<object>;

  /**
   * Callback to execute when playback has an error.
   * @returns An object containing the native values for the error callback.
   */
  errorCallback?: Function<object>;

  /**
   * Callback to execute when info is emitted from the player.
   * @returns An object containing the native values for the info callback.
   */
  infoCallback?: Function<object>;
}

export interface NSAudioPlayerI {
  readonly ios?: any;
  readonly android?: any;

  /**
   * Set to true to enable console log output for debugging.
   */
  debug: boolean;

  /**
   * Volume getter/setter
   */
  volume: any;

  /**
   * Duration getter
   */
  duration: number;

  initFromFile(options: AudioPlayerOptions): Promise<any>;

  /**
   * Starts playing audio file from local app files.
   */
  playFromFile(options: AudioPlayerOptions): Promise<any>;

  initFromUrl(options: AudioPlayerOptions): Promise<any>;

  /**
   * Starts playing audio file from url
   */
  playFromUrl(options: AudioPlayerOptions): Promise<any>;

  /**
   * Play audio file.
   */
  play(): Promise<boolean>;

  /**
   * Pauses playing audio file.
   */
  pause(): Promise<boolean>;

  /**
   * Resume audio player.
   */
  resume(): void;

  /**
   * Seeks to specific time.
   */
  seekTo(time: number): Promise<any>;

  /**
   * Releases resources from the audio player.
   */
  dispose(): Promise<boolean>;

  /**
   * Check if the audio is actively playing.
   */
  isAudioPlaying(): boolean;

  /**
   * Get the duration of the audio file playing.
   */
  getAudioTrackDuration(): Promise<string>;

  /**
   * Sets the player playback speed rate. On Android this works on API 23+.
   * @param speed [number] - The speed of the playback.
   */
  changePlayerSpeed(speed: number): void;

  /**
   * ** iOS ONLY ** - Begins playback at a certain delay, relative to the current playback time.
   * @param time [number] - The time to start playing the audio track at.
   */
  playAtTime(time: number);
}

export declare class NSAudioPlayer {
  // tslint:disable-next-line:variable-name
  static ObjCProtocols: any[];
  readonly ios: any;
  readonly android: any;
  readonly events: Observable;

  /**
   * Set to true to enable console log output for debugging.
   */
  debug: boolean;

  /**
   * Volume getter/setter
   */
  volume: any;

  /**
   * duration
   */
  duration: number;

  /**
   * current time
   */
  readonly currentTime: number;

  initFromFile(options: AudioPlayerOptions): Promise<any>;

  /**
   * Starts playing audio file from local app files.
   */
  playFromFile(options: AudioPlayerOptions): Promise<any>;

  initFromUrl(options: AudioPlayerOptions): Promise<any>;

  /**
   * Starts playing audio file from url
   */
  playFromUrl(options: AudioPlayerOptions): Promise<any>;

  /**
   * Play audio file.
   */
  play(): Promise<boolean>;

  /**
   * Pauses playing audio file.
   */
  pause(): Promise<boolean>;

  /**
   * Resume audio player.
   */
  resume(): void;

  /**
   * Seeks to specific time in seconds.
   * @param time [number] - The position of the track duration to seek to.
   */
  seekTo(time: number): Promise<any>;

  /**
   * Releases resources from the audio player.
   */
  dispose(): Promise<boolean>;

  /**
   * Check if the audio is actively playing.
   */
  isAudioPlaying(): boolean;

  /**
   * Get the duration of the audio file playing.
   */
  getAudioTrackDuration(): Promise<string>;

  /**
   * Android Only
   * Will set the playback speed for Android 23+, this is not available on lower Android APIs.
   * @param speed [number] - The speed of the playback.
   */
  changePlayerSpeed(speed: number): void;

  audioPlayerDidFinishPlayingSuccessfully(player?: any, flag?: boolean): void;
}

export enum AudioPlayerEvent {
  SEEK = 'seek',
  PAUSED = 'paused',
  STARTED = 'started',
  READY = 'ready'
}
