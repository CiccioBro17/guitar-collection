const micSelect = document.getElementById("mic-select");
const meterBar = document.getElementById("meter-bar");
const dials = document.querySelectorAll(".knob-dial");
const sliders = document.querySelectorAll(".knob-slider");
const badge = document.getElementById("badge");
const recordBtn = document.getElementById("record-btn");
const recIndicator = document.getElementById("rec-indicator");
const recTimeEl = document.getElementById("rec-time");
const effectsSwitch = document.getElementById("effects-switch");
const trackSwitch = document.getElementById("track-switch");

const KNOB_LABELS = ["Bass", "Mid", "Treble", "Volume", "Pitch"];
const VOLUME_GAIN = 200;
const PITCH_MIN = -24;
const PITCH_MAX = 24;

let badgeTimeout = null;

function showBadge(dial, text) {
    badge.textContent = text;
    const rect = dial.getBoundingClientRect();
    badge.style.left = rect.left + rect.width / 2 - badge.offsetWidth / 2 + "px";
    badge.style.top = rect.top - badge.offsetHeight - 10 + "px";
    badge.style.opacity = "1";
    clearTimeout(badgeTimeout);
    badgeTimeout = setTimeout(() => {
        badge.style.opacity = "0";
    }, 500);
}

let audioContext, stream, source, analyser, gainNode, dryVolumeGain, compressorNode;
let bassFilter, midFilter, trebleFilter;
let jungleNode = null;
let raf = null;
let mediaStream = null;

let wavSilent = null;
let recTracks = [];
let isRecording = false;
let recStartedAt = 0;
let recTimer = null;

let isBypassed = false;
let savedValues = null;

function mapRange(value, fmin, fmax) {
    return fmin + (value / 100) * (fmax - fmin);
}

function updateFilters() {
    if (!bassFilter) return;
    bassFilter.gain.setValueAtTime(mapRange(sliders[0].value, -12, 12), audioContext.currentTime);
    midFilter.gain.setValueAtTime(mapRange(sliders[1].value, -12, 12), audioContext.currentTime);
    trebleFilter.gain.setValueAtTime(mapRange(sliders[2].value, -12, 12), audioContext.currentTime);
    gainNode.gain.setValueAtTime(mapRange(sliders[3].value, 0, VOLUME_GAIN), audioContext.currentTime);
    dryVolumeGain.gain.setValueAtTime(mapRange(sliders[3].value, 0, VOLUME_GAIN), audioContext.currentTime);
}

function updatePitch() {
    if (!jungleNode) return;
    const semitones = Math.round(mapRange(sliders[4].value, PITCH_MIN, PITCH_MAX));
    jungleNode.setPitchOffset(window.getPitchMultiplier(semitones));
}

function applyAll() {
    updateFilters();
    updatePitch();
}

function refreshKnobVisuals() {
    dials.forEach((dial, i) => {
        const slider = sliders[i];
        const rotation = -135 + (slider.value / 100) * 270;
        dial.style.setProperty("--knob-rotation", rotation + "deg");
        dial.dataset.value = slider.value;
    });
}

function setupKnob(dial, slider, index) {
    const label = KNOB_LABELS[index];
    const valueEl = document.querySelector(`.knob-value[data-for="${slider.id}"]`);
    const defaultValue = Number(slider.defaultValue);

    const valueText = () => {
        if (label === "Volume") {
            return Math.round((slider.value / 100) * VOLUME_GAIN) + "x";
        }
        if (label === "Pitch") {
            const st = Math.round(mapRange(slider.value, PITCH_MIN, PITCH_MAX));
            return (st > 0 ? "+" : "") + st + " st";
        }
        const db = Math.round(mapRange(slider.value, -12, 12));
        return (db > 0 ? "+" : "") + db + " dB";
    };

    const rotate = (value) => {
        const rotation = -135 + (value / 100) * 270;
        dial.style.setProperty("--knob-rotation", rotation + "deg");
        dial.dataset.value = value;
        valueEl.textContent = valueText();
    };

    const apply = (value) => {
        const clamped = Math.min(100, Math.max(0, value));
        slider.value = clamped;
        rotate(clamped);
        applyAll();
        return clamped;
    };

    rotate(slider.value);

    slider.addEventListener("input", () => {
        rotate(slider.value);
        applyAll();
    });

    dial.addEventListener("mousedown", (e) => {
        if (isBypassed) return;
        e.preventDefault();
        const startY = e.clientY;
        const startValue = Number(slider.value);
        const onMouseMove = (ev) => {
            ev.preventDefault();
            const delta = (startY - ev.clientY) / 3;
            apply(startValue + delta);
            showBadge(dial, valueText());
        };
        const onMouseUp = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    });

    dial.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (isBypassed) return;
        apply(defaultValue);
        showBadge(dial, valueText());
    });

    dial.addEventListener("wheel", (e) => {
        if (isBypassed) return;
        e.preventDefault();
        const step = e.deltaY < 0 ? 1 : -1;
        apply(Number(slider.value) + step);
        showBadge(dial, valueText());
    }, { passive: false });
}

sliders.forEach((slider, i) => setupKnob(dials[i], slider, i));

function bypassEffects() {
    if (isBypassed) return;
    savedValues = sliders[0].value + "," + sliders[1].value + "," + sliders[2].value + "," + sliders[3].value + "," + sliders[4].value;
    sliders[0].value = 50;
    sliders[1].value = 50;
    sliders[2].value = 50;
    sliders[3].value = 100;
    sliders[4].value = 50;
    refreshKnobVisuals();
    applyAll();
    isBypassed = true;
    document.querySelector(".knobs").classList.add("bypassed");
}

function enableEffects() {
    if (!isBypassed || !savedValues) return;
    const vals = savedValues.split(",");
    sliders[0].value = vals[0];
    sliders[1].value = vals[1];
    sliders[2].value = vals[2];
    sliders[3].value = vals[3];
    sliders[4].value = vals[4];
    refreshKnobVisuals();
    applyAll();
    isBypassed = false;
    savedValues = null;
    document.querySelector(".knobs").classList.remove("bypassed");
}

if (effectsSwitch) {
    effectsSwitch.addEventListener("change", () => {
        if (effectsSwitch.checked) {
            enableEffects();
        } else {
            bypassEffects();
        }
    });
}

function encodeWav(channels, sampleRate) {
    const numChannels = channels.length;
    const length = channels[0].length;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = length * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeStr = (off, s) => {
        for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
    };

    writeStr(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, dataSize, true);

    let off = 44;
    for (let i = 0; i < length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            const s = Math.max(-1, Math.min(1, channels[ch][i]));
            view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            off += 2;
        }
    }

    return new Blob([buffer], { type: "audio/wav" });
}

function updateRecTime() {
    const elapsed = Math.max(0, Math.floor((Date.now() - recStartedAt) / 1000));
    const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const s = String(elapsed % 60).padStart(2, "0");
    recTimeEl.textContent = m + ":" + s;
}

async function startRecording() {
    if (!compressorNode || !audioContext) {
        console.error("Audio graph not ready for recording, restarting mic.");
        await startMic(micSelect.value);
        if (!compressorNode || !audioContext) return;
    }

    const numChannels = 2;
    if (wavSilent && wavSilent.connect) {
        try { wavSilent.disconnect(); } catch (e) {}
    }
    wavSilent = audioContext.createGain();
    wavSilent.gain.value = 0;
    wavSilent.connect(audioContext.destination);

    const taps = [{ name: "effects", node: compressorNode }];
    if (trackSwitch && trackSwitch.checked) taps.push({ name: "dry", node: dryVolumeGain });

    recTracks = taps.map((tap) => ({
        name: tap.name,
        tap: tap.node,
        buffers: [],
    }));

    recTracks.forEach((track) => {
        const proc = audioContext.createScriptProcessor(4096, numChannels, numChannels);
        proc.onaudioprocess = (e) => {
            const out = e.outputBuffer;
            for (let ch = 0; ch < out.numberOfChannels; ch++) {
                out.getChannelData(ch).fill(0);
            }
            if (!isRecording) return;
            const frame = [];
            for (let ch = 0; ch < numChannels; ch++) {
                frame.push(new Float32Array(e.inputBuffer.getChannelData(ch)));
            }
            track.buffers.push(frame);
        };
        track.proc = proc;
        track.tap.connect(proc);
        proc.connect(wavSilent);
    });

    isRecording = true;
    recStartedAt = Date.now();
    recTimeEl.textContent = "00:00";
    recTimer = setInterval(updateRecTime, 250);

    recordBtn.textContent = "Stop Recording";
    recordBtn.classList.add("recording");
    recIndicator.classList.add("on");
}

function framesToChannels(frames, numChannels) {
    if (frames.length === 0) return [];
    const frameLen = frames[0][0].length;
    const channels = [];
    for (let ch = 0; ch < numChannels; ch++) {
        const data = new Float32Array(frames.length * frameLen);
        for (let i = 0; i < frames.length; i++) {
            data.set(frames[i][ch], i * frameLen);
        }
        channels.push(data);
    }
    return channels;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function stopRecording() {
    if (!isRecording) return;

    isRecording = false;
    if (recTimer) {
        clearInterval(recTimer);
        recTimer = null;
    }
    updateRecTime();
    recordBtn.textContent = "Record";
    recordBtn.classList.remove("recording");
    recIndicator.classList.remove("on");

    const tracks = recTracks;
    recTracks = [];

    for (const track of tracks) {
        if (track.proc && track.tap) {
            try { track.tap.disconnect(track.proc); } catch (e) {}
            try { track.proc.disconnect(wavSilent); } catch (e) {}
        }
    }

    const sampleRate = audioContext.sampleRate;
    tracks.forEach((track, i) => {
        if (!track.buffers || track.buffers.length === 0) return;
        const channels = framesToChannels(track.buffers, 2);
        if (channels.length === 0) return;
        const blob = encodeWav(channels, sampleRate);
        setTimeout(() => downloadBlob(blob, `mictest-${track.name}.wav`), i * 300);
    });
}

recordBtn.addEventListener("click", () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

async function refreshMicList() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter((d) => d.kind === "audioinput");
        micSelect.innerHTML = "";
        if (mics.length === 0) {
            const opt = document.createElement("option");
            opt.textContent = "No microphones found";
            opt.disabled = true;
            micSelect.appendChild(opt);
            return;
        }
        mics.forEach((mic) => {
            const opt = document.createElement("option");
            opt.value = mic.deviceId;
            opt.textContent = mic.label || `Microphone ${micSelect.options.length}`;
            micSelect.appendChild(opt);
        });
        const defaultOpt = document.createElement("option");
        defaultOpt.value = "default";
        defaultOpt.textContent = "Default";
        micSelect.insertBefore(defaultOpt, micSelect.firstChild);
        micSelect.value = "default";
    } catch (err) {
        micSelect.innerHTML = '<option disabled>Select a microphone</option>';
        console.error("Failed to load devices:", err);
    }
}

function stopStream() {
    if (isRecording) stopRecording();
    if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
    }
    if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
        jungleNode = null;
        compressorNode = null;
        dryVolumeGain = null;
    }
    recordBtn.disabled = true;
}

async function startMic(deviceId) {
    stopStream();

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: deviceId ? { ideal: deviceId } : undefined,
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
            },
        });
    } catch (err) {
        console.error("Error accessing microphone:", err);
        return;
    }

    mediaStream = stream;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") {
        await audioContext.resume();
    }
    source = audioContext.createMediaStreamSource(stream);

    bassFilter = audioContext.createBiquadFilter();
    bassFilter.type = "lowshelf";
    bassFilter.frequency.value = 250;

    midFilter = audioContext.createBiquadFilter();
    midFilter.type = "peaking";
    midFilter.frequency.value = 1000;
    midFilter.Q.value = 1;

    trebleFilter = audioContext.createBiquadFilter();
    trebleFilter.type = "highshelf";
    trebleFilter.frequency.value = 4000;

    gainNode = audioContext.createGain();
    dryVolumeGain = audioContext.createGain();
    source.connect(dryVolumeGain);
    jungleNode = new window.Jungle(audioContext);
    compressorNode = audioContext.createDynamicsCompressor();
    compressorNode.threshold.value = -10;
    compressorNode.knee.value = 20;
    compressorNode.ratio.value = 12;
    compressorNode.attack.value = 0.003;
    compressorNode.release.value = 0.25;
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;

    source.connect(bassFilter);
    bassFilter.connect(midFilter);
    midFilter.connect(trebleFilter);
    trebleFilter.connect(gainNode);
    gainNode.connect(jungleNode.input);
    jungleNode.output.connect(compressorNode);
    compressorNode.connect(analyser);
    analyser.connect(audioContext.destination);

    applyAll();
    recordBtn.disabled = false;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const animate = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        meterBar.style.width = Math.min(100, (avg / 128) * 100) + "%";
        raf = requestAnimationFrame(animate);
    };
    animate();
}

micSelect.addEventListener("change", () => startMic(micSelect.value));

document.addEventListener("pointerdown", () => {
    if (audioContext && audioContext.state === "suspended") {
        audioContext.resume();
    }
});

if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener("devicechange", refreshMicList);
}

refreshMicList()
    .catch((err) => console.error("Failed to load devices:", err))
    .then(() => startMic(micSelect.value));
