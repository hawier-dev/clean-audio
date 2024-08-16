import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import WaveSurfer from 'wavesurfer.js';
import { useDropzone } from 'react-dropzone';
import { FaGithub, FaPlay, FaPause, FaVolumeUp, FaVolumeDown } from 'react-icons/fa';
import './App.css';

function App() {
  const [originalFile, setOriginalFile] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [waveform, setWaveform] = useState(null);
  const [processHistory, setProcessHistory] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const waveformRef = useRef(null);

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    setOriginalFile(file);
    setCurrentFile(file);
    setProcessHistory([]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  useEffect(() => {
    if (waveformRef.current && !waveform) {
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: 'violet',
        progressColor: 'purple',
        responsive: true,
        height: 200,
      });
      setWaveform(wavesurfer);

      wavesurfer.on('finish', () => setIsPlaying(false));
    }
  }, [waveform]);

  useEffect(() => {
    if (currentFile && waveform) {
      const fileUrl = URL.createObjectURL(currentFile);
      waveform.load(fileUrl);
    }
  }, [currentFile, waveform]);

  const processAudio = async (processType) => {
    if (!currentFile) {
      setError('Please select a file');
      return;
    }

    setProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', currentFile);
    formData.append('processType', processType);

    try {
      const response = await axios.post('http://localhost:5000/process', formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const processedFileBlob = new Blob([response.data], { type: 'audio/wav' });
      const processedFileName = `processed_${currentFile.name.split('.')[0]}.wav`;
      const processedFile = new File([processedFileBlob], processedFileName, { type: 'audio/wav' });

      setCurrentFile(processedFile);
      setProcessHistory([...processHistory, { type: processType, filename: processedFileName }]);
      waveform.load(URL.createObjectURL(processedFile));
    } catch (error) {
      setError('Error processing file');
      console.error('Error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (currentFile) {
      const url = URL.createObjectURL(currentFile);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = currentFile.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const resetToOriginal = () => {
    if (originalFile) {
      setCurrentFile(originalFile);
      setProcessHistory([]);
      waveform.load(URL.createObjectURL(originalFile));
    }
  };

  const togglePlay = () => {
    if (waveform) {
      waveform.playPause();
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (waveform) {
      waveform.setVolume(newVolume);
    }
  };

  const volumePercentage = volume * 100;
  const volumeSliderStyle = {
    background: `linear-gradient(to right, var(--secondary-color) 0%, var(--secondary-color) ${volumePercentage}%, var(--surface-color) ${volumePercentage}%)`
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
            <h1>Clean Audio</h1>
            <a href="https://github.com/hawier-dev" target="_blank" rel="noopener noreferrer" className="github-link">
              <FaGithub /> hawier-dev
            </a>
        </div>
      </header>
      <main className="App-main">
        <div className="sidebar left-sidebar">
          <h2>Load File</h2>
          <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
            <input {...getInputProps()} />
            {
              isDragActive ?
                <p>Drop the file here ...</p> :
                <p>Drag and drop an audio file here, or click to select a file</p>
            }
          </div>
          {currentFile && <p className="file-name">Current file: {currentFile.name}</p>}
          {processHistory.length > 0 && (
            <div className="process-history">
              <h3>Processing History:</h3>
              <ul>
                {processHistory.map((process, index) => (
                  <li key={index}>{process.type}</li>
                ))}
              </ul>
            </div>
          )}
          {originalFile && (
            <button onClick={resetToOriginal} className="reset-button">
              Reset to Original
            </button>
          )}
        </div>

        <div className="audio-track">
          <div ref={waveformRef} className="waveform-container"></div>
          <div className="audio-controls">
            <button onClick={togglePlay} className="play-button">
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            <div className="volume-control">
              <FaVolumeDown />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="volume-slider"
                style={volumeSliderStyle}
              />
              <FaVolumeUp />
            </div>
          </div>
          {currentFile && (
            <div className="result-section">
              <button onClick={handleDownload} className="download-button">
                Download Current File
              </button>
            </div>
          )}
          {error && <p className="error-message">{error}</p>}
        </div>

        <div className="sidebar right-sidebar">
          <h2>Processing Options</h2>
          <button
            onClick={() => processAudio('normalize')}
            disabled={processing || !currentFile}
            className="process-button"
          >
            Normalization
          </button>
          <button
            onClick={() => processAudio('noise_reduction')}
            disabled={processing || !currentFile}
            className="process-button"
          >
            Noise Reduction
          </button>
          {}
        </div>
      </main>
    </div>
  );
}

export default App;