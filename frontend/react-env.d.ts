/// <reference types="node" />

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
    SyncManager?: any;
  }

  interface Navigator {
    bluetooth?: {
      requestDevice(options?: any): Promise<any>;
    };
  }
}

export {};
