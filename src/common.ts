import * as fs from 'tns-core-modules/file-system';
import { isString } from 'tns-core-modules/utils/types';
import { AudioPlayerOptions } from './options';

export class NS_AUDIO_UTIL {
  static debug: boolean = false;
}

export class NS_AUDIO_LOGGER {
  constructor(protected platform: 'android' | 'ios') {
  }

  info(message, ...args) {
    console.error(`${this.getPrefix()} ${message}`, args);
  }

  error(message, ...args) {
    console.error(`${this.getPrefix()} ${message}`, args);
  }

  private getPrefix() {
    return `[NS_AUDIO_LOGGER:${this.platform}]:`;
  }
}

export interface NSAudioPlayer {
  /**
   * native instance getters
   */
  readonly ios?: any;
  readonly android?: any;

  /**
   * Volume getter/setter
   */
  volume: any;

  /**
   * Starts playing audio file from local app files.
   */
  playFromFile(options: AudioPlayerOptions): Promise<any>;

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
   * Seeks to specific time.
   */
  seekTo(time: number): Promise<boolean>;

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
   * current time
   */
  readonly currentTime: number;
}

/**
 * Helper function to determine if string is a url.
 * @param value [string]
 */
export const isStringUrl = (value: string): boolean => {
  // check if artURL is a url or local file
  let isURL = false;
  if (value.indexOf('://') !== -1) {
    if (value.indexOf('res://') === -1) {
      isURL = true;
    }
  }

  return isURL === true;
};

/**
 * Will determine if a string is a url or a local path. If the string is a url it will return the url.
 * If it is a local path, then the file-system module will return the file system path.
 * @param path [string]
 */
export const resolveAudioFilePath = (path: string) => {
  if (path) {
    const isUrl = isStringUrl(path);
    // if it's a url just return the audio file url
    if (isUrl === true) {
      return path;
    }

    let audioPath;
    let fileName = isString(path) ? path.trim() : '';

    if (fileName.indexOf('~/') === 0) {
      fileName = fs.path.join(fs.knownFolders.currentApp().path, fileName.replace('~/', ''));
      audioPath = fileName;
    } else {
      audioPath = fileName;
    }

    return audioPath;
  }
};
