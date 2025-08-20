import cn from "classnames";
import { memo, useState, useEffect, useRef } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { AudioRecorder } from "../../lib/audio-recorder";
import AudioPulse from "../audio-pulse/AudioPulse";
import "./control-tray.scss";

export type ControlTrayProps = {
  children?: React.ReactNode;
  supportsVideo: boolean;
};

type MediaStreamButtonProps = {
  isStreaming: boolean;
  start: () => Promise<any>;
  stop: () => any;
};

/**
 * button used for triggering webcam or screen-capture
 */
const MediaStreamButton = memo(
  ({ isStreaming, start, stop }: MediaStreamButtonProps) =>
    
    isStreaming ? (
      
      <button className="action-button" onClick={stop} style={{backgroundColor: 'red',}}>
        <svg
          width='16'
          height='16'
          
          viewBox='0 0 24 24'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
          style={{
            height: '3.5vh',
            color: 'white',
            width: '5.5vh',
            marginLeft: '3vh',
            marginRight: '1vh',
          }}
        >
          <path
            d='M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
          </svg>
        End Call
      </button>
      
    ) : (
      <button className="action-button" onClick={start}>
        <svg
          width='16'
          height='16'
          
          viewBox='0 0 24 24'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
          style={{
            height: '3.5vh',
            color: 'white',
            width: '5.5vh',
            marginLeft: '3vh',
            marginRight: '1vh',
          }}
        >
          <path
            d='M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
          </svg>
        Start a Call
      </button>
    ),
    
);
  const subtlePulse = `
    @keyframes subtlePulse {
      0% { opacity: 0.8; }
      50% { opacity: 0.95; }
      100% { opacity: 0.8; }
    }

    @keyframes subtlePing {
      0% { transform: scale(1); opacity: 0.3; }
      100% { transform: scale(1.1); opacity: 0; }
    }
  `;

function ControlTray({ supportsVideo }: ControlTrayProps) {
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const { client, connected, connect, disconnect, volume } =
    useLiveAPIContext();

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`,
    );
  }, [inVolume]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([{
        mimeType: "audio/pcm;rate=16000",
        data: base64,
      }]);
    };
    if (connected && !muted && audioRecorder) {
      audioRecorder.on("data", onData).on("volume", setInVolume).start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, muted, audioRecorder]);

  return (
    <section className="control-tray">
      {/* <nav className={cn("actions-nav", { disabled: !connected })}>
        <button
          className={cn("action-button mic-button")}
          onClick={() => setMuted(!muted)}
        >
          {!muted ? (
            <span className="material-symbols-outlined filled">mic</span>
          ) : (
            <span className="material-symbols-outlined filled">mic_off</span>
          )}
        </button>

        

        {supportsVideo && (
          <>
          </>
        )}
      </nav> */}

      <div className={cn("connection-container", { connected })}>
            <div style={{display: 'flex', marginBottom: '2vh', marginTop: '2vh'}}>

            <div className="flex items-center gap-3 w-40 mx-auto">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center relative">
                    {/* Inner circle with pulse animation */}
                    <div
                      className="w-6 h-6 rounded-full bg-white/90"
                      style={{
                        animation: 'subtlePulse 2s ease-in-out infinite',
                      }}
                    ></div>

                    {/* Outer gradient circle with ping animation */}
                    <div
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                      style={{
                        animation: 'subtlePing 2s ease-in-out infinite',
                      }}
                    ></div>

                    {/* Injecting animations */}
                    <style>{subtlePulse}</style>
                  </div>
                </div>
              <h1 style={{color: 'black', alignItems: 'center', justifyContent: 'center', fontSize: '25px', marginLeft: '2vh'}}>Need Help?</h1>
            </div>
        <div className="connection-button-container">
          <MediaStreamButton
            isStreaming={connected}
            start={connect}
            stop={disconnect}
          />
          
          
          <div className='powered-by'>
              Powered by <a href="https://easyai.us" target="_blank" rel="noopener noreferrer" className="easyai">EasyAI</a>
          </div>
        </div>
        <span className="text-indicator">Streaming</span>
      </div>
    </section>
  );
}

export default memo(ControlTray);
