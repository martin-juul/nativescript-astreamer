/**
 * Provides options for the audio player.
 */
export interface AudioPlayerOptions {
  /**
   * Gets or sets the audio file url.
   */
  audioFile: string;

  /**
   * Gets or sets the callback when the currently playing audio file completes.
   * @returns An object containing the native values for the callback.
   */
  completeCallback?: Function;

  /**
   * Get or sets the player to loop playback.
   */
  loop: boolean;

  /**
   * Prevent autoplay if desired as player autoplays be default
   */
  autoPlay?: boolean;

  /**
   * Enable metering. Off by default.
   */
  metering?: boolean;

  /**
   * Gets or sets the callback when an error occurs with the audio player.
   * @returns An object containing the native values for the error callback.
   */
  errorCallback?: Function;

  /**
   * Gets or sets the callback to be invoked to communicate some info and/or warning about the media or its playback.
   * @returns An object containing the native values for the info callback.
   */
  infoCallback?: Function;
}

export enum AudioPlayerEvent {
  SEEK = 'seek',
  PAUSED = 'paused',
  STARTED = 'started',
  READY = 'ready'
}
