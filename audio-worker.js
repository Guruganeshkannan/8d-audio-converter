// Audio processing worker
self.onmessage = function (e) {
    const {
        channelData,
        sampleRate,
        duration,
        rotationSpeed,
        rotationDepth,
        reverbIntensity,
        quality,
        chunkIndex,
        totalChunks
    } = e.data;

    // Process the audio data
    try {
        processAudioChunk(
            channelData,
            sampleRate,
            duration,
            rotationSpeed,
            rotationDepth,
            reverbIntensity,
            quality,
            chunkIndex,
            totalChunks
        ).then(result => {
            // Send the processed data back to the main thread
            self.postMessage({
                type: 'result',
                result: result,
                chunkIndex: chunkIndex
            });
        }).catch(error => {
            self.postMessage({
                type: 'error',
                error: error.message
            });
        });
    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
};

function processAudioChunk(channelData, sampleRate, duration, rotationSpeed, rotationDepth, reverbIntensity, quality, chunkIndex, totalChunks) {
    // Calculate chunk size based on quality
    let chunkSize = 10; // Default: 10 seconds per chunk
    if (quality === 'high') {
        chunkSize = 5;
    } else if (quality === 'low') {
        chunkSize = 20;
    }

    // For very long files, use larger chunks
    if (duration > 300) {
        chunkSize = Math.max(chunkSize, 30);
    }

    const startTime = chunkIndex * chunkSize;
    const endTime = Math.min(startTime + chunkSize, duration);

    // Create audio context for processing
    const audioContext = new OfflineAudioContext({
        numberOfChannels: 2,
        length: Math.ceil((endTime - startTime) * sampleRate),
        sampleRate: sampleRate
    });

    // Create source buffer from the raw channel data
    const buffer = createBufferFromRawData(channelData, sampleRate, startTime, endTime);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;

    // Create effects
    const panner = audioContext.createStereoPanner();
    const gain = audioContext.createGain();

    // Apply rotation effect
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

    // Apply reverb if needed
    let convolver = null;
    if (reverbIntensity > 0) {
        convolver = audioContext.createConvolver();
        const impulseLength = 2 * sampleRate;
        const impulse = audioContext.createBuffer(2, impulseLength, sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < impulseLength; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.5)) * reverbIntensity;
            }
        }
        convolver.buffer = impulse;
    }

    // Connect nodes
    source.connect(panner);
    panner.connect(gain);

    if (convolver) {
        const dryGain = audioContext.createGain();
        const wetGain = audioContext.createGain();
        dryGain.gain.value = 1 - reverbIntensity;
        wetGain.gain.value = reverbIntensity;
        gain.connect(dryGain);
        gain.connect(convolver);
        convolver.connect(wetGain);
        dryGain.connect(audioContext.destination);
        wetGain.connect(audioContext.destination);
    } else {
        gain.connect(audioContext.destination);
    }

    // Start processing
    source.start();

    // Return the processed audio data
    return audioContext.startRendering().then(renderedBuffer => {
        // Extract the processed audio data as Float32Arrays
        const processedData = {
            leftChannel: renderedBuffer.getChannelData(0),
            rightChannel: renderedBuffer.getChannelData(1),
            startTime: startTime,
            endTime: endTime
        };

        return processedData;
    });
}

function createBufferFromRawData(channelData, sampleRate, startTime, endTime) {
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.ceil(endTime * sampleRate);
    const length = endSample - startSample;

    const buffer = new AudioBuffer({
        length: length,
        numberOfChannels: 2,
        sampleRate: sampleRate
    });

    // Copy the relevant portion of the audio data
    for (let channel = 0; channel < 2; channel++) {
        const channelBuffer = buffer.getChannelData(channel);
        const sourceData = channelData[channel];

        for (let i = 0; i < length; i++) {
            channelBuffer[i] = sourceData[startSample + i];
        }
    }

    return buffer;
} 