const streamUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8';
const metadataUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json';
const albumArtUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/cover.jpg';
const audio = document.getElementById('radioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.querySelector('.play-icon');
const pauseIcon = document.querySelector('.pause-icon');
const volumeBtn = document.getElementById('volumeBtn');
const volumeSlider = document.getElementById('volumeSlider');
const currentTimeDisplay = document.getElementById('currentTime');
const durationDisplay = document.getElementById('duration');
const status = document.getElementById('status');
// New layout elements
const artistName = document.getElementById('artistName');
const artistSurname = document.getElementById('artistSurname');
const songTitle = document.getElementById('songTitle');
const albumInfo = document.getElementById('albumInfo');
const recentTracks = document.getElementById('recentTracks');
const albumArt = document.getElementById('albumArt');
const albumArtPlaceholder = document.querySelector('.album-art-placeholder');
const thumbsUpBtn = document.getElementById('thumbsUp');
const thumbsDownBtn = document.getElementById('thumbsDown');
const thumbsUpCount = document.getElementById('thumbsUpCount');
const thumbsDownCount = document.getElementById('thumbsDownCount');
const ratingStatus = document.getElementById('ratingStatus');
const sourceQuality = document.getElementById('sourceQuality');
const streamQuality = document.getElementById('streamQuality');

let hls = null;
let isPlaying = false;
let currentSongId = null;
let userFingerprint = null;

function initializePlayer() {
    if (Hls.isSupported()) {
        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90
        });
        
        hls.loadSource(streamUrl);
        hls.attachMedia(audio);
        
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            updateStatus('Stream loaded and ready to play');
        });
        
        hls.on(Hls.Events.ERROR, function(event, data) {
            console.error('HLS Error:', data);
            updateStatus('Stream error: ' + data.details);
        });
        
        hls.on(Hls.Events.MEDIA_ATTACHED, function() {
            updateStatus('Media attached, ready to play');
        });
        
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = streamUrl;
        updateStatus('Native HLS support detected');
    } else {
        updateStatus('HLS not supported in this browser');
        return;
    }
}

function updateStatus(message) {
    status.textContent = message;
}

function formatTime(seconds) {
    if (!isFinite(seconds)) return 'Live';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateTimeDisplay() {
    currentTimeDisplay.textContent = formatTime(audio.currentTime);
    if (isFinite(audio.duration)) {
        durationDisplay.textContent = formatTime(audio.duration);
    } else {
        durationDisplay.textContent = 'Live';
    }
}

function updateVolumeIcon() {
    if (audio.volume === 0) {
        volumeBtn.textContent = '🔇';
    } else if (audio.volume < 0.5) {
        volumeBtn.textContent = '🔉';
    } else {
        volumeBtn.textContent = '🔊';
    }
}

function togglePlayPause() {
    if (!isPlaying) {
        audio.play().then(() => {
            isPlaying = true;
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'inline';
            updateStatus('Playing live stream');
        }).catch(error => {
            console.error('Play error:', error);
            updateStatus('Error playing stream: ' + error.message);
        });
    } else {
        audio.pause();
        isPlaying = false;
        playIcon.style.display = 'inline';
        pauseIcon.style.display = 'none';
        updateStatus('Stream paused');
    }
}

function toggleMute() {
    if (audio.volume > 0) {
        audio.dataset.previousVolume = audio.volume;
        audio.volume = 0;
        volumeSlider.value = 0;
    } else {
        const previousVolume = audio.dataset.previousVolume || 0.5;
        audio.volume = previousVolume;
        volumeSlider.value = previousVolume * 100;
    }
    updateVolumeIcon();
}

playPauseBtn.addEventListener('click', togglePlayPause);
volumeBtn.addEventListener('click', toggleMute);

volumeSlider.addEventListener('input', function() {
    audio.volume = this.value / 100;
    updateVolumeIcon();
});

audio.addEventListener('loadstart', function() {
    updateStatus('Loading stream...');
});

audio.addEventListener('canplay', function() {
    updateStatus('Stream ready to play');
});

audio.addEventListener('playing', function() {
    updateStatus('Playing live stream');
    isPlaying = true;
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'inline';
});

audio.addEventListener('pause', function() {
    updateStatus('Stream paused');
    isPlaying = false;
    playIcon.style.display = 'inline';
    pauseIcon.style.display = 'none';
});

audio.addEventListener('timeupdate', function() {
    updateTimeDisplay();
});

audio.addEventListener('durationchange', function() {
    updateTimeDisplay();
});

audio.addEventListener('volumechange', function() {
    updateVolumeIcon();
    volumeSlider.value = audio.volume * 100;
});

audio.addEventListener('error', function(e) {
    console.error('Audio error:', e);
    updateStatus('Audio playback error');
    isPlaying = false;
    playIcon.style.display = 'inline';
    pauseIcon.style.display = 'none';
});

async function fetchTrackMetadata() {
    try {
        const response = await fetch(metadataUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        updateTrackDisplay(data);
    } catch (error) {
        console.error('Error fetching metadata:', error);
        updateTrackDisplay(null);
    }
}

function updateTrackDisplay(data) {
    if (!data) {
        artistName.textContent = 'Unable to load';
        artistSurname.textContent = 'track info';
        songTitle.textContent = '-';
        albumInfo.textContent = '-';
        
        // Reset quality to default values when no data
        if (sourceQuality) sourceQuality.textContent = '16-bit 44.1kHz';
        if (streamQuality) streamQuality.textContent = '48kHz FLAC / HLS Lossless';
        
        albumArt.style.display = 'none';
        albumArtPlaceholder.style.display = 'block';
        recentTracks.innerHTML = '<div class="loading">Unable to load recent tracks</div>';
        return;
    }

    // Parse artist name (split at first space if possible)
    const fullArtist = data.artist || 'Unknown Artist';
    const artistParts = fullArtist.split(' ');
    const firstName = artistParts[0] || 'Unknown';
    const lastName = artistParts.slice(1).join(' ') || '';
    
    artistName.textContent = firstName;
    artistSurname.textContent = lastName || 'Artist';
    songTitle.textContent = data.title || 'Unknown Track';
    albumInfo.textContent = data.album || 'Unknown Album';

    // Update quality information from metadata or use defaults
    if (sourceQuality) sourceQuality.textContent = data.source_quality || data.sourceQuality || '16-bit 44.1kHz';
    if (streamQuality) streamQuality.textContent = data.stream_quality || data.streamQuality || '48kHz FLAC / HLS Lossless';

    // Generate song ID and load ratings
    const newSongId = generateSongId(data.title || 'Unknown Track', data.artist || 'Unknown Artist');
    console.log('Generated song ID:', newSongId);
    if (newSongId !== currentSongId) {
        currentSongId = newSongId;
        console.log('Loading ratings for song:', currentSongId);
        loadSongRatings(currentSongId);
    }

    // Load album art
    loadAlbumArt();

    // Extract previous tracks from the API format (prev_artist_1, prev_title_1, etc.)
    const recentTracksData = [];
    for (let i = 1; i <= 5; i++) {
        const artist = data[`prev_artist_${i}`];
        const title = data[`prev_title_${i}`];
        if (artist && title) {
            recentTracksData.push({ artist, title });
        }
    }

    if (recentTracksData.length > 0) {
        const recentTracksHtml = recentTracksData.map(track => `
            <div class="recent-track">
                <span class="recent-track-artist">${track.artist || 'Unknown Artist'}:</span>
                <span class="recent-track-title">${track.title || 'Unknown Track'}</span>
            </div>
        `).join('');
        recentTracks.innerHTML = recentTracksHtml;
    } else {
        recentTracks.innerHTML = '<div class="loading">No recent tracks available</div>';
    }
}

function loadAlbumArt() {
    // Add timestamp to prevent caching of old album art
    const timestamp = new Date().getTime();
    const artUrl = `${albumArtUrl}?t=${timestamp}`;
    
    // Create a new image to test if it loads successfully
    const img = new Image();
    
    img.onload = function() {
        albumArt.src = artUrl;
        albumArt.style.display = 'block';
        albumArtPlaceholder.style.display = 'none';
    };
    
    img.onerror = function() {
        albumArt.style.display = 'none';
        albumArtPlaceholder.style.display = 'block';
    };
    
    img.src = artUrl;
}

function generateSongId(title, artist) {
    // Create a simple hash of title and artist for song identification
    return btoa(encodeURIComponent(`${title}-${artist}`)).replace(/[^a-zA-Z0-9]/g, '');
}

function generateFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Fingerprinting text 🎵', 2, 2);
    
    const fingerprint = {
        // Screen properties
        screenWidth: screen.width,
        screenHeight: screen.height,
        screenColorDepth: screen.colorDepth,
        screenPixelDepth: screen.pixelDepth,
        
        // Navigator properties
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages ? navigator.languages.join(',') : '',
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        maxTouchPoints: navigator.maxTouchPoints || 0,
        
        // Timezone
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
        
        // Canvas fingerprint
        canvasFingerprint: canvas.toDataURL(),
        
        // WebGL fingerprint
        webglVendor: '',
        webglRenderer: '',
        
        // Audio context fingerprint
        audioFingerprint: '',
        
        // Fonts detection (basic)
        fonts: '',
        
        // Local storage support
        localStorageSupport: typeof(Storage) !== 'undefined',
        sessionStorageSupport: typeof(sessionStorage) !== 'undefined',
        
        // Hardware concurrency
        hardwareConcurrency: navigator.hardwareConcurrency || 1
    };
    
    // WebGL fingerprinting
    try {
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                fingerprint.webglVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                fingerprint.webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
        }
    } catch (e) {
        // WebGL not supported
    }
    
    // Audio context fingerprinting (simplified)
    try {
        if (window.AudioContext || window.webkitAudioContext) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            fingerprint.audioFingerprint = audioContext.sampleRate.toString() + audioContext.state;
            if (audioContext.close) {
                audioContext.close();
            }
        }
    } catch (e) {
        fingerprint.audioFingerprint = 'unsupported';
    }
    
    // Simplified font detection
    try {
        const canvas2 = document.createElement('canvas');
        const ctx2 = canvas2.getContext('2d');
        ctx2.font = '16px Arial';
        fingerprint.fonts = ctx2.measureText('test').width.toString();
    } catch (e) {
        fingerprint.fonts = 'unknown';
    }
    
    // Create hash from all fingerprint data
    const fingerprintString = JSON.stringify(fingerprint);
    return btoa(encodeURIComponent(fingerprintString)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 64);
}

async function loadSongRatings(songId) {
    console.log('loadSongRatings called with songId:', songId);
    
    if (!songId) {
        thumbsUpCount.textContent = '0';
        thumbsDownCount.textContent = '0';
        ratingStatus.textContent = 'No song selected';
        thumbsUpBtn.disabled = true;
        thumbsDownBtn.disabled = true;
        return;
    }

    if (!userFingerprint) {
        console.log('Generating user fingerprint...');
        userFingerprint = generateFingerprint();
        console.log('Generated fingerprint:', userFingerprint.substring(0, 10) + '...');
    }

    try {
        // Load overall ratings
        console.log('Fetching ratings for song:', songId);
        const ratingsResponse = await fetch(`/ratings/${songId}`);
        console.log('Ratings response status:', ratingsResponse.status);
        
        if (ratingsResponse.ok) {
            const ratingsData = await ratingsResponse.json();
            console.log('Ratings data:', ratingsData);
            thumbsUpCount.textContent = ratingsData.thumbs_up || 0;
            thumbsDownCount.textContent = ratingsData.thumbs_down || 0;
        } else {
            console.error('Failed to fetch ratings:', ratingsResponse.status);
        }

        // Load user's rating using fingerprint
        console.log('Fetching user rating for fingerprint:', userFingerprint.substring(0, 10) + '...');
        const userRatingResponse = await fetch(`/ratings/${songId}/user/${userFingerprint}`);
        console.log('User rating response status:', userRatingResponse.status);
        
        if (userRatingResponse.ok) {
            const userData = await userRatingResponse.json();
            console.log('User rating data:', userData);
            updateRatingButtons(userData.userRating);
            
            thumbsUpBtn.disabled = false;
            thumbsDownBtn.disabled = false;
            
            if (userData.userRating === 1) {
                ratingStatus.textContent = 'You liked this song';
            } else if (userData.userRating === -1) {
                ratingStatus.textContent = 'You disliked this song';
            } else {
                ratingStatus.textContent = 'Rate this song';
            }
        } else {
            console.error('Failed to fetch user rating:', userRatingResponse.status);
            ratingStatus.textContent = 'Rate this song';
            thumbsUpBtn.disabled = false;
            thumbsDownBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error loading ratings:', error);
        ratingStatus.textContent = 'Unable to load ratings';
        thumbsUpBtn.disabled = true;
        thumbsDownBtn.disabled = true;
    }
}

function updateRatingButtons(userRating) {
    thumbsUpBtn.classList.remove('active');
    thumbsDownBtn.classList.remove('active');
    
    if (userRating === 1) {
        thumbsUpBtn.classList.add('active');
    } else if (userRating === -1) {
        thumbsDownBtn.classList.add('active');
    }
}

async function rateSong(rating) {
    if (!currentSongId) return;
    
    if (!userFingerprint) {
        userFingerprint = generateFingerprint();
    }
    
    try {
        const response = await fetch('/ratings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                songId: currentSongId,
                rating: rating,
                userFingerprint: userFingerprint
            })
        });
        
        if (response.ok) {
            // Reload ratings to get updated counts
            await loadSongRatings(currentSongId);
        } else {
            const errorData = await response.json();
            ratingStatus.textContent = 'Error: ' + errorData.error;
        }
    } catch (error) {
        console.error('Error rating song:', error);
        ratingStatus.textContent = 'Unable to save rating';
    }
}

function startMetadataUpdates() {
    fetchTrackMetadata();
    setInterval(fetchTrackMetadata, 30000);
}

audio.volume = 0.5;

// Rating button event listeners
thumbsUpBtn.addEventListener('click', () => rateSong(1));
thumbsDownBtn.addEventListener('click', () => rateSong(-1));

document.addEventListener('DOMContentLoaded', function() {
    // Generate fingerprint early
    userFingerprint = generateFingerprint();
    console.log('User fingerprint generated:', userFingerprint.substring(0, 10) + '...');
    
    initializePlayer();
    updateVolumeIcon();
    updateTimeDisplay();
    startMetadataUpdates();
});