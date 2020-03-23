# nativescript-astreamer
---

Forked from [https://github.com/nstudio/nativescript-audio](https://github.com/nstudio/nativescript-audio)

## Changes

+ Removed recording capability
+ Fixed iOS player

## Installation

`tns plugin add nativescript-astreamer`

---

### Android Native Classes

- [Player - android.media.MediaPlayer](http://developer.android.com/reference/android/media/MediaPlayer.html)

### iOS Native Classes

- [Player - AVAudioPlayer](https://developer.apple.com/library/ios/documentation/AVFoundation/Reference/AVAudioPlayerClassReference/)

## Usage

### TypeScript Example

```typescript
import { NSAudioPlayer } from 'nativescript-astreamer';

export class YourClass {
  private player: NSAudioPlayer;

  constructor() {
    this.player = new NSAudioPlayer();
    this.player.debug = true; // set true to enable TNSPlayer console logs for debugging.

    (async () => {
      await this.player.initFromFile({
        audioFile: '~/audio/song.mp3', // ~ = app directory
        loop: false,
        completeCallback: this._trackComplete.bind(this),
        errorCallback: this._trackError.bind(this)
      })

      // iOS: duration is in seconds
      // Android: duration is in milliseconds
      const duration = this.player.getAudioTrackDuration();
      console.log(`duration: ${duration}`);
     })();
  }

  public togglePlay() {
    if (this.player.isAudioPlaying()) {
      this.player.pause();
    } else {
      this.player.play();
    }
  }

  private _trackComplete(args: any) {
    console.log('reference back to player:', args.player);
    // iOS only: flag indicating if completed succesfully
    console.log('whether song play completed successfully:', args.flag);
  }

  private _trackError(args: any) {
    console.log('reference back to player:', args.player);
    console.log('the error:', args.error);
    // Android only: extra detail on error
    console.log('extra info on the error:', args.extra);
  }
}
```

## API

### Player

#### NSAudioPlayer Methods

| Method                                                                 | Description                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| _initFromFile(options: AudioPlayerOptions)_: `Promise`                 | Initialize player instance with a file without auto-playing. |
| _playFromFile(options: AudioPlayerOptions)_: `Promise`                 | Auto-play from a file.                                       |
| _initFromUrl(options: AudioPlayerOptions)_: `Promise`                  | Initialize player instance from a url without auto-playing.  |
| _playFromUrl(options: AudioPlayerOptions)_: `Promise`                  | Auto-play from a url.                                        |
| _pause()_: `Promise<boolean>`                                          | Pause playback.                                              |
| _resume()_: `void`                                                     | Resume playback.                                             |
| _seekTo(time:number)_: `Promise<boolean>`                              | Seek to position of track (in seconds).                     |
| _dispose()_: `Promise<boolean>`                                        | Free up resources when done playing audio.                   |
| _isAudioPlaying()_: `boolean`                                          | Determine if player is playing.                              |
| _getAudioTrackDuration()_: `Promise<string>`                           | Duration of media file assigned to the player.               |
| _playAtTime(time: number)_: void - **_iOS Only_**                      | Play audio track at specific time of duration.               |
| _changePlayerSpeed(speed: number)_: void - **On Android Only API 23+** | Change the playback speed of the media player.               |

#### NSAudioPlayer Instance Properties

| Property                | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| _ios_                   | Get the native ios AVAudioPlayer instance.                 |
| _android_               | Get the native android MediaPlayer instance.               |
| _debug_: `boolean`      | Set true to enable debugging console logs (default false). |
| _currentTime_: `number` | Get the current time in the media file's duration.         |
| _volume_: `number`      | Get/Set the player volume. Value range from 0 to 1.        |

### License

[MIT](/LICENSE)

### Demo App

:no_entry_sign:

The demo has not been migrated yet.

- fork/clone the repository
- cd into the `src` directory
- execute `npm run demo.android` or `npm run demo.ios` (scripts are located in the `scripts` of the package.json in the `src` directory if you are curious)
