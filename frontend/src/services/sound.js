class SoundService {
  constructor() {
    this.audioContext = null
    this.isPlaying = false
    this.currentOscillators = []
    this.soundTimeout = null
    this.currentSound = null
    this.volume = 0.7
  }

  // Initialize sound files
  init() {
    try {
      // Create audio contexts for generating sounds
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      
      console.log('Sound service initialized with Web Audio API')
    } catch (error) {
      console.error('Failed to initialize sound service:', error)
    }
  }

  // Play outgoing call sound (for caller)
  playOutgoingRingtone() {
    if (this.isPlaying || !this.audioContext) return
    
    try {
      this.isPlaying = true
      this.currentSound = 'outgoing'
      
      // Generate outgoing call sound pattern (single beep repeating)
      this.playBeepPattern([
        { frequency: 400, duration: 0.5, pause: 0.5 },
      ], true) // loop = true
      
      console.log('Outgoing ringtone started')
    } catch (error) {
      console.error('Error playing outgoing ringtone:', error)
      this.isPlaying = false
    }
  }

  // Play incoming call sound (for receiver)
  playIncomingRingtone() {
    if (this.isPlaying || !this.audioContext) return
    
    try {
      this.isPlaying = true
      this.currentSound = 'incoming'
      
      // Generate incoming call sound pattern (dual-tone ring pattern)
      this.playBeepPattern([
        { frequency: 440, duration: 0.4 },
        { frequency: 480, duration: 0.4, pause: 2.0 },
      ], true) // loop = true
      
      console.log('Incoming ringtone started')
    } catch (error) {
      console.error('Error playing incoming ringtone:', error)
      this.isPlaying = false
    }
  }

  // Stop all ringtones
  stopRingtones() {
    try {
      if (this.soundTimeout) {
        clearTimeout(this.soundTimeout)
        this.soundTimeout = null
      }
      
      if (this.currentOscillators) {
        this.currentOscillators.forEach(osc => {
          try {
            osc.stop()
          } catch (e) {
            // Oscillator might already be stopped
          }
        })
        this.currentOscillators = []
      }
      
      this.isPlaying = false
      this.currentSound = null
      console.log('Ringtones stopped')
    } catch (error) {
      console.error('Error stopping ringtones:', error)
    }
  }

  // Generate beep patterns using Web Audio API
  playBeepPattern(pattern, loop = false) {
    if (!this.audioContext) return
    
    this.currentOscillators = []
    let totalDuration = 0
    
    pattern.forEach((beep, index) => {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
      
      // Set frequency
      oscillator.frequency.setValueAtTime(beep.frequency, this.audioContext.currentTime)
      oscillator.type = 'sine'
      
      // Set volume envelope
      const volume = this.volume * 0.3
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime + totalDuration)
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + totalDuration + 0.01)
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime + totalDuration + beep.duration - 0.01)
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + totalDuration + beep.duration)
      
      // Start and stop oscillator
      oscillator.start(this.audioContext.currentTime + totalDuration)
      oscillator.stop(this.audioContext.currentTime + totalDuration + beep.duration)
      
      this.currentOscillators.push(oscillator)
      
      totalDuration += beep.duration + (beep.pause || 0)
    })
    
    // Set up looping if needed
    if (loop) {
      this.soundTimeout = setTimeout(() => {
        if (this.isPlaying) {
          this.playBeepPattern(pattern, loop)
        }
      }, totalDuration * 1000)
    }
  }

  // Play notification sound
  playNotification() {
    try {
      if (!this.audioContext) return
      
      // Use Web Audio API to generate a simple beep
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime)
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2)
      
      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + 0.2)
    } catch (error) {
      console.error('Error playing notification sound:', error)
    }
  }

  // Set volume for ringtones (stored for future oscillators)
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume))
  }

  // Check if sound is currently playing
  isPlayingSound() {
    return this.isPlaying
  }
}

// Create singleton instance
const soundService = new SoundService()

export default soundService