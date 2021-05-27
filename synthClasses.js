const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const keyboard = document.querySelector(".keyboard");

const oscList = []; // currently playing oscilators






class Keyboard {
  noteFreq = []; // array of frequencies
  octaves = []; // array of notes by octave
  clearAllBtn = document.getElementById("clear-all");
  playAllBtn = document.getElementById("play-all");
  constructor() {

  }
 
  keyboardSetup() {
    this.createNoteTable();
    for (let i = 0; i < this.octaves.length; i++) {
      this.octaves[i].renderOctave();
    }
    this.playAllBtn.addEventListener("click", this.playAll.bind(this));
    this.clearAllBtn.addEventListener("click", this.clearAll.bind(this));
  }
  //sets up an array of frequencies and then pushes them onto an array of Octave objects
  createNoteTable() { 
    const allFreq = [];
    for (let n = 0; n < 96; n++) {
      const note = 27.5 * (2 ** (1 / 12)) ** n;
      allFreq.push(note.toFixed(2));
    }
    for (let oct = 0; oct < allFreq.length; oct += 12) {
      let octave = allFreq.slice(oct, oct + 12);
      this.noteFreq.push(octave);
    }
    for (let i = 0; i < this.noteFreq.length; i++) {
      let octave = new Octave(i, ...this.noteFreq[i]); //i should be the register
      this.octaves.push(octave);
    }
  }

  //removes all active oscillators
clearAll() {
  for (let i = 0; i < this.octaves.length; i++) {
    Object.keys(this.octaves[i]).forEach((key) => {
      if (this.octaves[i][key].on === true) {
        const btn = document.getElementById(`${key} ${i}`);
        this.octaves[i][key].triggerOscillator(btn);
      }
    });
  }
}

//this function handles the play or mute all functionality
playAll() {
  let btnClassText = "";
  if (this.playAllBtn.textContent === "Play All") {
    this.playAllBtn.textContent = "Mute All";
    btnClassText = "play-off";
  } else {
    this.playAllBtn.textContent = "Play All";
    btnClassText = "play-on";
  }
  for (let i = 0; i < this.octaves.length; i++) {
    Object.keys(this.octaves[i]).forEach((key) => {
      if (this.octaves[i][key].on === true) {
        const playBtn = document.getElementById(`play ${key} ${i}`);
        playBtn.className = btnClassText;
        const settings = document.getElementById(`modal ${key} ${i}`);
        const volumeRange = settings.querySelector('input[name="volume"]');
        this.octaves[i][key].oscillator.playBtnHandler(playBtn, volumeRange);
      }
    });
  }
}

}

class NoiseOscillator extends OscillatorNode {
  constructor(freq) {
    super(audioCtx, { frequency: freq });
    this.connect(audioCtx.destination);
    this.oscGain = audioCtx.createGain();
    this.oscGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    this.connect(this.oscGain).connect(audioCtx.destination);
    this.start();
  }

  //sets up the settings modals for each oscillator
  
  settingsHandler(btn) {
    const rootHook = document.getElementById("settings");
    const settingsEl = document.createElement("div");
    settingsEl.setAttribute("id", `modal ${btn.id}`);
    settingsEl.className = "modal";
    settingsEl.innerHTML = `
  <h2>Note: ${btn.id} - ${parseFloat(this.frequency.value).toFixed(2)}Hz</h2>
  <input type="range" min="-1" max="1.0" step="0.01" value="0.5" name="volume">
  <select>
  <option value="sine" selected>Sine</option>
  <option value="square">Square</option>
  <option value="sawtooth">Sawtooth</option>
  </select>
  <button id='play ${btn.id}' class='play-on'>Mute</button>
  
  `;
    const volumeRange = settingsEl.querySelector("input");
    const waveSelect = settingsEl.querySelector("select");
    const playBtn = settingsEl.querySelector("button");
    volumeRange.addEventListener("input", () => {
      this.oscGain.gain.setValueAtTime(volumeRange.value, audioCtx.currentTime);
      playBtn.className = "play-on";
    });
    waveSelect.addEventListener("change", () => (this.type = waveSelect.value));
    playBtn.addEventListener(
      "click",
      this.playBtnHandler.bind(this, playBtn, volumeRange)
    );

    rootHook.append(settingsEl);
  }

  // handles oscillator volumes AND text content of play/mute buttons
  playBtnHandler(playBtn, volumeRange) {
    if (playBtn.className === "play-on") {
      this.oscGain.gain.setValueAtTime(-1, audioCtx.currentTime);
      playBtn.className = "play-off";
      playBtn.textContent = "Play";
      noiseMachine.playAllBtn.textContent = "Play All";
    } else if (playBtn.className === "play-off") {
      this.oscGain.gain.setValueAtTime(volumeRange.value, audioCtx.currentTime);
      playBtn.className = "play-on";
      playBtn.textContent = "Mute";
      noiseMachine.playAllBtn.textContent = "Mute All";
    }
  }
}

class Note {
  on = false;
  constructor(name, freq, reg) {
    this.name = name;
    this.freq = freq;
    this.register = reg;
  }

  renderNote(hook) {
    const noteEl = document.createElement("button");
    const note = `${this.name} ${this.register}`;
    noteEl.className = `note`;
    noteEl.textContent = note;
    noteEl.id = note;

    hook.append(noteEl);
    const freq = parseFloat(this.freq).toFixed(2);
    const btn = document.getElementById(note);

    btn.addEventListener("click", this.triggerOscillator.bind(this, btn));
  }
  //sets up the oscillator for the note object. noteNmae is the note object
  triggerOscillator(btn) {
    btn.classList.toggle("on");
    noiseMachine.playAllBtn.textContent = "Mute All";
    if (this.on === false) {
      this.on = true;
      this.oscillator = new NoiseOscillator(this.freq);
      this.oscillator.settingsHandler(btn);
    } else {
      this.oscillator.stop();
      delete this.oscillator;
      delete this.oscGain;
      this.on = false;
      const child = document.getElementById(`modal ${btn.id}`);
      document.getElementById("settings").removeChild(child);
    }
  }
}

class Octave {
  constructor(reg, A, Bb, B, C, Db, D, Eb, E, F, Gb, G, Ab) {
    this.register = reg;
    this.A = new Note("A", A, reg);
    this.Bb = new Note("Bb", Bb, reg);
    this.B = new Note("B", B, reg);
    this.C = new Note("C", C, reg);
    this.Db = new Note("Db", Db, reg);
    this.D = new Note("D", D, reg);
    this.Eb = new Note("Eb", Eb, reg);
    this.E = new Note("E", E, reg);
    this.F = new Note("F", F, reg);
    this.Gb = new Note("Gb", Gb, reg);
    this.G = new Note("G", G, reg);
    this.Ab = new Note("Ab", Ab, reg);
  }

  renderOctave() {
    const octave = document.createElement("div");
    octave.className = "octave";
    keyboard.append(octave);
    this.A.renderNote(octave);
    this.Bb.renderNote(octave);
    this.B.renderNote(octave);
    this.C.renderNote(octave);
    this.Db.renderNote(octave);
    this.D.renderNote(octave);
    this.Eb.renderNote(octave);
    this.E.renderNote(octave);
    this.F.renderNote(octave);
    this.Gb.renderNote(octave);
    this.G.renderNote(octave);
    this.Ab.renderNote(octave);
  }
}

const noiseMachine = new Keyboard();

noiseMachine.keyboardSetup();
