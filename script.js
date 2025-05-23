document.addEventListener('DOMContentLoaded', () => {
    const inputFile = document.getElementById('input-file');
    const convertBtn = document.getElementById('convert-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const status = document.getElementById('status');
    const downloadLink = document.getElementById('download-link');
    const progressBar = document.getElementById('progress-bar');
    const progressValue = document.getElementById('progress-value');
    const timeLeftDisplay = document.getElementById('time-left');

    const speedSlider = document.getElementById('rotation-speed');
    const speedValue = document.getElementById('speed-value');
    const depthSlider = document.getElementById('rotation-depth');
    const depthValue = document.getElementById('depth-value');
    const reverbSlider = document.getElementById('reverb-intensity');
    const reverbValue = document.getElementById('reverb-value');

    let isCanceled = false;
    let progressInterval = null;

    if (!timeLeftDisplay) {
        console.error('Element with id "time-left" not found in DOM.');
    }

    speedSlider.addEventListener('input', () => {
        speedValue.textContent = (speedSlider.value / 10).toFixed(1);
    });

    depthSlider.addEventListener('input', () => {
        depthValue.textContent = depthSlider.value;
    });

    reverbSlider.addEventListener('input', () => {
        reverbValue.textContent = reverbSlider.value;
    });

    const updateProgress = (percentage, message, totalTime = 0) => {
        progressBar.value = percentage;
        progressValue.textContent = `${percentage}%`;
        status.textContent = message;
        if (timeLeftDisplay) {
            if (percentage > 0 && percentage < 100 && totalTime > 0) {
                const timeLeft = Math.round(totalTime * (1 - percentage / 100));
                timeLeftDisplay.textContent = `Time Left: ${timeLeft}s`;
            } else {
                timeLeftDisplay.textContent = '–';
            }
        }
    };

    const qualitySelect = document.createElement('select');
    qualitySelect.id = 'quality-setting';
    qualitySelect.innerHTML = `
        <option value="high">High Quality (Slower)</option>
        <option value="medium" selected>Medium Quality</option>
        <option value="low">Low Quality (Faster)</option>
    `;

    const qualityLabel = document.createElement('label');
    qualityLabel.htmlFor = 'quality-setting';
    qualityLabel.textContent = 'Processing Quality: ';

    const qualityGroup = document.createElement('div');
    qualityGroup.className = 'slider-group';
    qualityGroup.appendChild(qualityLabel);
    qualityGroup.appendChild(qualitySelect);

    const buttonGroup = document.querySelector('.button-group');
    buttonGroup.parentNode.insertBefore(qualityGroup, buttonGroup);

    async function processChunk(audioBuffer, finalBuffer, sampleRate, startTime, endTime, rotationSpeed, rotationDepth, reverbIntensity) {
        const chunkLength = Math.ceil((endTime - startTime) * sampleRate);
        const chunkBuffer = new AudioBuffer({
            length: chunkLength,
            numberOfChannels: 2,
            sampleRate: sampleRate
        });

        for (let channel = 0; channel < 2; channel++) {
            const sourceData = audioBuffer.getChannelData(channel);
            const targetData = chunkBuffer.getChannelData(channel);
            const startSample = Math.floor(startTime * sampleRate);

            for (let i = 0; i < chunkLength; i++) {
                targetData[i] = sourceData[startSample + i];
            }
        }

        const offlineContext = new OfflineAudioContext({
            numberOfChannels: 2,
            length: chunkLength,
            sampleRate: sampleRate
        });

        const source = offlineContext.createBufferSource();
        source.buffer = chunkBuffer;

        const panner = offlineContext.createStereoPanner();
        const gain = offlineContext.createGain();

        for (let t = 0; t < endTime - startTime; t += 1 / sampleRate) {
            const time = startTime + t;
            const angle = 2 * Math.PI * rotationSpeed * time;
            const panValue = Math.sin(angle) * rotationDepth;
            panner.pan.setValueAtTime(panValue, t);

            const gainValue = (Math.cos(angle) + 1) / 2;
            const dbGain = -8 + 8 * gainValue;
            const linearGain = Math.pow(10, dbGain / 20);
            gain.gain.setValueAtTime(linearGain, t);
        }

        let convolver = null;
        if (reverbIntensity > 0) {
            convolver = offlineContext.createConvolver();
            const impulseLength = 2 * sampleRate;
            const impulse = offlineContext.createBuffer(2, impulseLength, sampleRate);
            for (let channel = 0; channel < 2; channel++) {
                const data = impulse.getChannelData(channel);
                for (let i = 0; i < impulseLength; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.5)) * reverbIntensity;
                }
            }
            convolver.buffer = impulse;
        }

        source.connect(panner);
        panner.connect(gain);

        if (convolver) {
            const dryGain = offlineContext.createGain();
            const wetGain = offlineContext.createGain();
            dryGain.gain.value = 1 - reverbIntensity;
            wetGain.gain.value = reverbIntensity;
            gain.connect(dryGain);
            gain.connect(convolver);
            convolver.connect(wetGain);
            dryGain.connect(offlineContext.destination);
            wetGain.connect(offlineContext.destination);
        } else {
            gain.connect(offlineContext.destination);
        }

        source.start();

        const renderedBuffer = await offlineContext.startRendering();

        const startSample = Math.floor(startTime * sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const sourceData = renderedBuffer.getChannelData(channel);
            const targetData = finalBuffer.getChannelData(channel);

            for (let i = 0; i < chunkLength; i++) {
                targetData[startSample + i] = sourceData[i];
            }
        }
    }

    convertBtn.addEventListener('click', async () => {
        if (!inputFile.files.length) {
            status.textContent = 'Please select an MP3 file.';
            return;
        }

        convertBtn.disabled = true;
        cancelBtn.disabled = false;
        isCanceled = false;
        downloadLink.style.display = 'none';
        updateProgress(0, 'Preparing...');

        try {
            const file = inputFile.files[0];
            if (!file.type.includes('audio/mpeg') && !file.name.endsWith('.mp3')) {
                throw new Error('Please upload a valid MP3 file.');
            }

            updateProgress(10, 'Loading audio file...');
            const arrayBuffer = await file.arrayBuffer();
            if (arrayBuffer.byteLength === 0) {
                throw new Error('The uploaded MP3 file is empty.');
            }

            updateProgress(20, 'Decoding audio...');
            const audioContext = new AudioContext();
            let audioBuffer;
            try {
                audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            } catch (error) {
                throw new Error('Failed to decode audio. The MP3 may be corrupted.');
            }
            await audioContext.close();

            const duration = audioBuffer.duration;
            const sampleRate = audioBuffer.sampleRate;
            if (duration <= 0) {
                throw new Error('Invalid audio duration. Please try another MP3.');
            }

            const totalTime = duration * 1.5;
            const length = Math.ceil(duration * sampleRate);

            const qualitySetting = document.getElementById('quality-setting').value;

            let chunkSize = 10;
            if (qualitySetting === 'high') {
                chunkSize = 5;
            } else if (qualitySetting === 'low') {
                chunkSize = 20;
            }

            if (duration > 300) {
                chunkSize = Math.max(chunkSize, 30);
            }

            const totalChunks = Math.ceil(duration / chunkSize);

            const finalBuffer = new AudioBuffer({
                length: length,
                numberOfChannels: 2,
                sampleRate: sampleRate
            });

            updateProgress(30, 'Setting up 8D effect...', totalTime);

            for (let i = 0; i < totalChunks; i++) {
                if (isCanceled) {
                    throw new Error('Conversion canceled');
                }

                const chunkIndex = i;
                const startTime = chunkIndex * chunkSize;
                const endTime = Math.min(startTime + chunkSize, duration);

                const chunkProgress = 30 + (chunkIndex / totalChunks) * 60;
                updateProgress(chunkProgress, `Processing chunk ${chunkIndex + 1}/${totalChunks} (${Math.round(startTime)}s - ${Math.round(endTime)}s)...`, totalTime);

                await processChunk(
                    audioBuffer,
                    finalBuffer,
                    sampleRate,
                    startTime,
                    endTime,
                    speedSlider.value / 10,
                    depthSlider.value / 100,
                    reverbSlider.value / 100
                );
            }

            updateProgress(90, 'Generating output...', totalTime);
            const wavBlob = bufferToWave(finalBuffer, length, sampleRate);
            const url = URL.createObjectURL(wavBlob);
            downloadLink.href = url;
            downloadLink.download = file.name.replace('.mp3', '_8d.wav');
            downloadLink.style.display = 'block';
            downloadLink.textContent = 'Download 8D Audio (WAV)';
            updateProgress(100, 'Conversion complete!', totalTime);

            // Auto-download the file
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name.replace('.mp3', '_8d.wav');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

        } catch (error) {
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            if (!isCanceled) {
                console.error('Error:', error);
                status.textContent = `Error: ${error.message}`;
                updateProgress(0, `Error: ${error.message}`);
            }
        } finally {
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            convertBtn.disabled = false;
            cancelBtn.disabled = true;
        }
    });

    cancelBtn.addEventListener('click', () => {
        isCanceled = true;
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }

        status.textContent = 'Conversion canceled';
        updateProgress(0, 'Conversion canceled');
        convertBtn.disabled = false;
        cancelBtn.disabled = true;
        downloadLink.style.display = 'none';
    });

    function bufferToWave(audioBuffer, length, sampleRate) {
        const numberOfChannels = audioBuffer.numberOfChannels;
        const wavLength = length * numberOfChannels * 2 + 44;
        const buffer = new ArrayBuffer(wavLength);
        const view = new DataView(buffer);

        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length * numberOfChannels * 2, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numberOfChannels * 2, true);
        view.setUint16(32, numberOfChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, length * numberOfChannels * 2, true);

        for (let channel = 0; channel < numberOfChannels; channel++) {
            const data = audioBuffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const sample = Math.max(-1, Math.min(1, data[i]));
                view.setInt16(44 + (i * numberOfChannels + channel) * 2, sample * 0x7FFF, true);
            }
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }

    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    // Add footer with developer credit
    const footer = document.createElement('footer');
    footer.style.textAlign = 'center';
    footer.style.padding = '20px';
    footer.style.marginTop = 'auto';
    footer.style.borderTop = '1px solid #ddd';
    footer.style.fontSize = '14px';
    footer.style.color = '#666';
    footer.style.position = 'relative';
    footer.style.bottom = '0';
    footer.style.width = '100%';
    footer.style.backgroundColor = '#f9f9f9';
    footer.innerHTML = 'Developed by Guruganesh from <a href="https://edoble.in" target="_blank" style="color: #4a6cf7; text-decoration: none;">edoble</a>';

    // Make sure the body has a minimum height to push the footer down
    document.body.style.minHeight = '100vh';
    document.body.style.display = 'flex';
    document.body.style.flexDirection = 'column';

    // Add the footer to the body
    document.body.appendChild(footer);
});