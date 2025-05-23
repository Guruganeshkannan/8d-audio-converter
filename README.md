# 8D Audio Converter

## Overview
The 8D Audio Converter is a web-based application that transforms standard MP3 audio files into 8D (360° spatial) audio, creating an immersive listening experience best enjoyed with headphones. The application uses the Web Audio API to apply effects such as stereo panning, gain modulation, and reverb to simulate sound movement around the listener. Users can customize parameters like rotation speed, depth, and reverb intensity, and choose processing quality settings to balance speed and output quality.

## Features
- **File Input**: Upload MP3 files for conversion.
- **Customizable Parameters**:
  - **Horizontal Rotation Speed**: Adjust the speed of sound rotation (in Hz).
  - **Horizontal Rotation Depth**: Control the intensity of the panning effect (as a percentage).
  - **Reverb Intensity**: Add reverb to enhance spatial effects (as a percentage).
  - **Processing Quality**: Choose between High, Medium, or Low quality for conversion speed vs. output fidelity.
- **Progress Tracking**: Displays real-time progress, estimated time left, and conversion status.
- **Output**: Generates a downloadable WAV file with the 8D audio effect.
- **Responsive Design**: Works on various screen sizes with a clean, user-friendly interface.

## Prerequisites
- A modern web browser (e.g., Chrome, Firefox, Edge) with support for the Web Audio API.
- Headphones are recommended for the best 8D audio experience.

## Installation
No installation is required as this is a web-based application. To run the project locally:

1. **Clone or Download the Repository**:
   - Download the project files or clone the repository to your local machine.
2. **Serve the Files**:
   - Use a local web server (e.g., `python -m http.server 8000` or any static file server) to serve the project files.
   - Alternatively, open `index.html` directly in a browser, but note that some features (e.g., file handling) may be restricted due to browser security policies.
3. **Access the Application**:
   - Navigate to the served URL (e.g., `http://localhost:8000`) or open `index.html` in your browser.

## Usage
1. **Open the Application**:
   - Access the application via a web browser.
2. **Upload an MP3 File**:
   - Click the "Choose File" button to select an MP3 file from your device.
3. **Adjust Parameters**:
   - Use the sliders to set the desired **Horizontal Rotation Speed**, **Horizontal Rotation Depth**, and **Reverb Intensity**.
   - Select a **Processing Quality** (High, Medium, or Low) from the dropdown menu.
4. **Start Conversion**:
   - Click the "Convert to 360° 8D" button to begin processing.
   - Monitor the progress bar and status messages for updates.
5. **Cancel (Optional)**:
   - Click the "Cancel" button to stop the conversion process if needed.
6. **Download the Result**:
   - Once conversion is complete, the processed WAV file will automatically download, or you can click the "Download 8D Audio (WAV)" link.

## File Structure
- **index.html**: The main HTML file containing the structure of the web application.
- **style.css**: CSS file for styling the user interface.
- **script.js**: JavaScript file handling the frontend logic, user interactions, and audio processing.
- **audio-worker.js**: Web Worker script for offloading audio processing tasks to improve performance.

## Technical Details
- **Web Audio API**: Used for decoding MP3 files, applying audio effects (panning, gain, reverb), and rendering the output.
- **Web Worker**: The `audio-worker.js` script processes audio chunks in the background to prevent UI blocking.
- **Audio Processing**:
  - Audio is processed in chunks (5-30 seconds, depending on quality and file length) to manage memory usage.
  - Effects include:
    - **Stereo Panning**: Simulates sound movement using `StereoPannerNode`.
    - **Gain Modulation**: Adjusts volume dynamically to enhance the 8D effect.
    - **Reverb**: Adds spatial depth using a `ConvolverNode` with a generated impulse response.
- **Output Format**: The processed audio is exported as a WAV file for broad compatibility.
- **Quality Settings**:
  - **High**: Smaller chunk sizes (5s) for better accuracy, slower processing.
  - **Medium**: Balanced chunk sizes (10s) for reasonable speed and quality.
  - **Low**: Larger chunk sizes (20s) for faster processing, slightly reduced quality.

## Limitations
- **File Size and Duration**: Very large or long MP3 files (>5 minutes) may require longer processing times, mitigated by larger chunk sizes.
- **Browser Compatibility**: Requires a modern browser with Web Audio API support. Some features may not work in older browsers.
- **Input Format**: Only MP3 files are supported for input.
- **Processing Speed**: High-quality settings or long audio files may take significant time to process, depending on the device's performance.

## Troubleshooting
- **"Please select an MP3 file"**: Ensure a valid MP3 file is selected before clicking "Convert."
- **"Failed to decode audio"**: The MP3 file may be corrupted or unsupported. Try a different file.
- **"Conversion canceled"**: The user clicked the "Cancel" button, or an error occurred. Check the console for details.
- **Slow Performance**: Try selecting "Low Quality" for faster processing, or use a more powerful device.

## Developer
Developed by Guruganesh from [edoble](https://edoble.in).

## License
This project is licensed under the MIT License. See the `LICENSE` file for details (if applicable).

## Acknowledgments
- Built using the Web Audio API and modern web technologies.
- Inspired by the growing popularity of 8D audio experiences on platforms like YouTube.
