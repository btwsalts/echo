// ========== State ==========
let map;
let markers = {};
let selectedLatLng = null;
let isAddingMode = false;
let echoes = [];
let activeEchoId = null;
let editingEchoId = null;
let draftPhoto = '';

const STORAGE_KEY = 'localecho_echoes_v1';

// Sample seeds so the map isn't empty on first visit
const SEED_ECHOES = [
  {
    id: 'seed1',
    lat: 31.5204,
    lng: 74.3587,
    title: 'The first monsoon I remember',
    story: 'I was seven. We ran outside the house on Jail Road when the rain started. My father held a newspaper over our heads and we still got soaked. The smell of wet earth still brings me back.',
    author: 'Ayesha',
    date: '2023-07-12'
  },
  {
    id: 'seed2',
    lat: 31.5497,
    lng: 74.3436,
    title: 'Late-night chai after exams',
    story: 'Every final week we ended up here around 1 a.m. The owner never asked us to leave. He just kept the kettle going. That table near the window still feels like ours.',
    author: 'Anonymous',
    date: '2024-11-03'
  },
  {
    id: 'seed3',
    lat: 31.5100,
    lng: 74.3450,
    title: 'Where I learned to ride',
    story: 'My uncle held the back of the bicycle the whole time and pretended he was still holding on long after he had let go. I only found out years later.',
    author: 'Hassan',
    date: '2022-03-18'
  },
  {
    id: 'seed4',
    lat: 24.8607,
    lng: 67.0011,
    title: 'Sea breeze and silence',
    story: 'Came here alone after a hard conversation. Watched the waves for an hour. Somehow the noise of the city felt farther away than the water.',
    author: 'Sana',
    date: '2025-01-09'
  },
  {
    id: 'seed5',
    lat: 33.6844,
    lng: 73.0479,
    title: 'The tree that survived everything',
    story: 'This old tree outside the school gate has been here longer than any of us. We carved initials once. They are almost gone now, but the memory isn’t.',
    author: 'Omar',
    date: '2024-05-22'
  }
];

// ========== Init ==========
function init() {
  loadEchoes();
  initBoard();
  bindEvents();
}

function loadEchoes() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      echoes = JSON.parse(saved);
      if (!Array.isArray(echoes) || echoes.length === 0) {
        echoes = [...SEED_ECHOES];
        saveEchoes();
      }
    } catch (e) {
      echoes = [...SEED_ECHOES];
      saveEchoes();
    }
  } else {
    echoes = [...SEED_ECHOES];
    saveEchoes();
  }
}

function saveEchoes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(echoes));
}

function initBoard() {
  map = L.map('map', { zoomControl: false }).setView([31.5204, 74.3587], 5);
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  window.echoIcon = L.divIcon({ className: 'echo-pin', html: '<span class="pin-core"></span>', iconSize: [22, 22], iconAnchor: [11, 11] });
  document.getElementById('mapLoading').style.display = 'none';
  renderAllMarkers();
  renderSidebar();

  // Try geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 12);
      },
      () => {},
      { timeout: 4000 }
    );
  }

  map.on('click', (event) => {
    if (isAddingMode) {
      selectedLatLng = event.latlng;
      document.getElementById('locationHint').innerHTML =
        `📌 Location selected: ${selectedLatLng.lat.toFixed(5)}, ${selectedLatLng.lng.toFixed(5)}`;
      openModal();
    }
  });
}

// ========== Markers & List ==========
function renderAllMarkers() {
  Object.values(markers).forEach(marker => map.removeLayer(marker));
  markers = {};
  echoes.forEach(echo => {
    const marker = L.marker([echo.lat, echo.lng], { icon: window.echoIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup(createPopupContent(echo));
    const markerElement = marker.getElement();
    if (markerElement) {
      markerElement.style.setProperty('--pin-delay', `${Math.min(Object.keys(markers).length, 8) * 70}ms`);
    }
    marker.on('click', () => showEchoDetails(echo));
    markers[echo.id] = marker;
  });
}

function createPopupContent(echo) {
  return `<strong>${escapeHtml(echo.title)}</strong><br><small>${escapeHtml(echo.author || 'Anonymous')} · ${formatDate(echo.date)}</small>`;
}

function showEchoDetails(echo) {
  activeEchoId = echo.id;
  document.querySelectorAll('.echo-pin-selected').forEach(marker => marker.classList.remove('echo-pin-selected'));
  markers[echo.id]?.getElement()?.classList.add('echo-pin-selected');
  document.getElementById('detailTitle').textContent = echo.title;
  document.getElementById('detailMeta').textContent = `${echo.author || 'Anonymous'} · ${formatDate(echo.date)}`;
  document.getElementById('detailBody').textContent = echo.story;
  const detailPhoto = document.getElementById('detailPhoto');
  detailPhoto.hidden = !echo.photo;
  detailPhoto.src = echo.photo || '';
  detailPhoto.alt = echo.photo ? `Photo for ${echo.title}` : '';
  document.getElementById('favoriteDetail').textContent = echo.favorite ? '★ Favorited' : '☆ Favorite';
  document.getElementById('echoDetail').classList.add('open');
}

function renderSidebar() {
  const list = document.getElementById('echoList');
  const countEl = document.getElementById('echoCount');
  countEl.textContent = echoes.length;

  if (echoes.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div style="font-size:2rem;">🗺️</div>
        <p>No echoes yet.<br>Be the first to leave a memory here.</p>
      </div>`;
    return;
  }

  const searchTerm = document.getElementById('storySearch')?.value.trim().toLowerCase() || '';
  const filter = document.getElementById('storyFilter')?.value || 'all';
  let sorted = [...echoes].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (filter === 'recent') sorted = sorted.slice(0, 5);
  if (filter === 'favorites') sorted = sorted.filter(echo => echo.favorite);
  if (searchTerm) sorted = sorted.filter(echo => `${echo.title} ${echo.story} ${echo.author}`.toLowerCase().includes(searchTerm));

  if (sorted.length === 0) {
    list.innerHTML = '<div class="empty-state"><div style="font-size:2rem;">⌕</div><p>No matching echoes yet.</p></div>';
    return;
  }

  list.innerHTML = sorted.map((echo, index) => `
    <div class="echo-card" data-id="${echo.id}" style="--card-delay: ${Math.min(index, 8) * 45}ms">
      <div class="meta">
        <span class="author">${escapeHtml(echo.author || 'Anonymous')}</span>
        <span>${echo.favorite ? '★ ' : ''}${formatDate(echo.date)}</span>
      </div>
      <div class="title">${escapeHtml(echo.title)}</div>
      <div class="preview">${escapeHtml(echo.story)}</div>
    </div>
  `).join('');

  // Click handlers
  list.querySelectorAll('.echo-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const echo = echoes.find(e => e.id === id);
      if (echo) {
        map.setView([echo.lat, echo.lng], Math.max(map.getZoom(), 12));
        markers[id]?.openPopup();
        // highlight
        list.querySelectorAll('.echo-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      }
    });
  });
}

// ========== Events ==========
function bindEvents() {
  document.getElementById('addEchoBtn').addEventListener('click', startAddMode);
  document.getElementById('locateBtn').addEventListener('click', locateMe);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('cancelModal').addEventListener('click', closeModal);
  document.getElementById('submitEcho').addEventListener('click', submitEcho);
  document.getElementById('exportBtn').addEventListener('click', exportEchoes);
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', importEchoes);
  document.getElementById('closeDetail').addEventListener('click', () => document.getElementById('echoDetail').classList.remove('open'));
  document.getElementById('editDetail').addEventListener('click', editActiveEcho);
  document.getElementById('useLocationBtn').addEventListener('click', useCurrentLocationForDraft);
  document.getElementById('echoPhoto').addEventListener('change', handlePhotoChange);
  document.getElementById('storySearch').addEventListener('input', renderSidebar);
  document.getElementById('storyFilter').addEventListener('change', renderSidebar);
  document.getElementById('randomEchoBtn').addEventListener('click', showRandomEcho);
  document.getElementById('favoriteDetail').addEventListener('click', toggleActiveFavorite);
  document.getElementById('deleteDetail').addEventListener('click', deleteActiveEcho);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.querySelectorAll('.overlay.open').forEach(overlay => overlay.classList.remove('open'));
      closeModal();
    }
  });

  // Mobile sidebar toggle
  const toggleBtn = document.getElementById('toggleSidebar');
  if (window.innerWidth <= 800) {
    toggleBtn.style.display = 'inline-block';
    toggleBtn.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }
}

function showRandomEcho() {
  if (!echoes.length) return showToast('Add an echo first');
  const echo = echoes[Math.floor(Math.random() * echoes.length)];
  map.setView([echo.lat, echo.lng], Math.max(map.getZoom(), 12));
  showEchoDetails(echo);
  markers[echo.id]?.openPopup();
}

function toggleActiveFavorite() {
  const echo = echoes.find(item => item.id === activeEchoId);
  if (!echo) return;
  echo.favorite = !echo.favorite;
  saveEchoes();
  renderSidebar();
  showEchoDetails(echo);
}

function deleteActiveEcho() {
  const echo = echoes.find(item => item.id === activeEchoId);
  if (!echo || !confirm(`Delete “${echo.title}”?`)) return;
  echoes = echoes.filter(item => item.id !== activeEchoId);
  saveEchoes();
  renderAllMarkers();
  renderSidebar();
  document.getElementById('echoDetail').classList.remove('open');
  showToast('Echo deleted');
}

function startAddMode() {
  isAddingMode = true;
  editingEchoId = null;
  draftPhoto = '';
  selectedLatLng = null;
  document.getElementById('locationHint').innerHTML =
    '📌 Click anywhere on the map to place your echo';
  showToast('Click on the map to choose a location');
  // visual cue
  document.getElementById('map').style.cursor = 'crosshair';
}

function openModal(echo = null) {
  if (echo) {
    editingEchoId = echo.id;
    document.getElementById('echoTitle').value = echo.title;
    document.getElementById('echoStory').value = echo.story;
    document.getElementById('echoAuthor').value = echo.author === 'Anonymous' ? '' : echo.author;
    selectedLatLng = { lat: echo.lat, lng: echo.lng };
    draftPhoto = echo.photo || '';
    document.getElementById('locationHint').textContent = `📌 Location: ${echo.lat.toFixed(5)}, ${echo.lng.toFixed(5)}`;
    updatePhotoPreview();
  }
  document.getElementById('addModal').classList.add('open');
  document.getElementById('echoTitle').focus();
}

function closeModal() {
  document.getElementById('addModal').classList.remove('open');
  isAddingMode = false;
  selectedLatLng = null;
  editingEchoId = null;
  draftPhoto = '';
  document.getElementById('map').style.cursor = '';
  document.getElementById('echoForm').reset();
  document.getElementById('photoPreview').innerHTML = '';
}

function submitEcho() {
  const title = document.getElementById('echoTitle').value.trim();
  const story = document.getElementById('echoStory').value.trim();
  const author = document.getElementById('echoAuthor').value.trim() || 'Anonymous';

  if (!title || !story) {
    showToast('Please fill in title and story');
    return;
  }
  if (!selectedLatLng) {
    showToast('Please click on the map to choose a location');
    return;
  }

  const isEditing = Boolean(editingEchoId);
  const existingEcho = echoes.find(echo => echo.id === editingEchoId);
  const newEcho = {
    id: editingEchoId || 'e_' + Date.now(),
    lat: selectedLatLng.lat,
    lng: selectedLatLng.lng,
    title,
    story,
    author,
    date: isEditing ? existingEcho.date : new Date().toISOString().slice(0, 10),
    photo: draftPhoto,
    favorite: isEditing ? existingEcho.favorite : false
  };

  if (editingEchoId) {
    echoes = echoes.map(echo => echo.id === editingEchoId ? newEcho : echo);
  } else {
    echoes.push(newEcho);
  }
  saveEchoes();
  renderAllMarkers();
  renderSidebar();
  closeModal();

  setTimeout(() => showEchoDetails(newEcho), 300);

  showToast(isEditing ? 'Echo updated' : 'Echo left successfully ✨');
}

function editActiveEcho() {
  const echo = echoes.find(item => item.id === activeEchoId);
  if (!echo) return;
  document.getElementById('echoDetail').classList.remove('open');
  isAddingMode = false;
  openModal(echo);
}

function useCurrentLocationForDraft() {
  if (!navigator.geolocation) return showToast('Location is not supported');
  showToast('Finding your location…');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      selectedLatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      map.setView([selectedLatLng.lat, selectedLatLng.lng], 14);
      document.getElementById('locationHint').textContent = `📌 Location selected: ${selectedLatLng.lat.toFixed(5)}, ${selectedLatLng.lng.toFixed(5)}`;
      showToast('Location added');
    },
    () => showToast('Could not get your location')
  );
}

function handlePhotoChange(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) return showToast('Please choose a photo under 2 MB');
  const reader = new FileReader();
  reader.onload = () => {
    draftPhoto = reader.result;
    updatePhotoPreview();
  };
  reader.readAsDataURL(file);
}

function updatePhotoPreview() {
  document.getElementById('photoPreview').innerHTML = draftPhoto ? `<img src="${draftPhoto}" alt="Selected photo preview">` : '';
}

function locateMe() {
  if (!navigator.geolocation) {
    showToast('Geolocation not supported');
    return;
  }
  showToast('Finding you…');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      map.setView([pos.coords.latitude, pos.coords.longitude], 14);
      showToast('You are here');
    },
    () => showToast('Could not get your location')
  );
}

function exportEchoes() {
  const file = new Blob([JSON.stringify(echoes, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = 'echo-stories.json';
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Your stories were downloaded');
}

function importEchoes(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported) || imported.some(echo => !echo.title || !echo.story)) throw new Error();
      if (echoes.length && !confirm('Replace your current stories with this backup?')) return;
      echoes = imported;
      saveEchoes();
      renderAllMarkers();
      renderSidebar();
      showToast(`${echoes.length} stories restored`);
    } catch (error) {
      showToast('That file is not an Echo backup');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ========== Helpers ==========
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// Start
init();
