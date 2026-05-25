const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbxAJpFrETNLluPa4zx9h-DlOF0xmMHTUoMCVd55Nj3GxY-60eQTXaZw3l-imdKCRFwLrA/exec';
const DEFAULT_ADMIN_TOKEN = 'myDashboardAdmin123';

const state = {
  apiUrl: localStorage.getItem('miniYoutubeApiUrl') || DEFAULT_API_URL,
  adminToken: localStorage.getItem('miniYoutubeAdminToken') || DEFAULT_ADMIN_TOKEN,
  channels: [],
  teachers: [],
  videos: [],
  sheetNames: [],
  filtered: [],
  activeType: 'all',
  activeVideo: null,
  selectedVideoIds: new Set(),
  selectedVideoOrder: [],
  analysisVideos: []
};

const els = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  bindEvents();
  refreshIcons();
  hydrateSettings();
  loadDashboard();
});

function cacheElements() {
  [
    'refreshButton',
    'syncButton',
    'settingsButton',
    'closeSettingsButton',
    'saveSettingsButton',
    'testConnectionButton',
    'searchInput',
    'channelFilter',
    'teacherFilter',
    'dateFilter',
    'fromDateFilter',
    'toDateFilter',
    'sortFilter',
    'statTotal',
    'statViews',
    'statShorts',
    'statLive',
    'resultHeading',
    'lastUpdated',
    'selectedCount',
    'clearSelectionButton',
    'analyzeButton',
    'videoGrid',
    'emptyState',
    'channelList',
    'teacherList',
    'channelCount',
    'teacherCount',
    'loadingOverlay',
    'loadingText',
    'settingsPanel',
    'apiUrlInput',
    'adminTokenInput',
    'settingsMessage',
    'playerModal',
    'modalChannel',
    'modalTitle',
    'modalViews',
    'modalPublished',
    'modalDuration',
    'youtubeFrame',
    'playerFrameWrap',
    'miniPlayerButton',
    'fullscreenButton',
    'teacherManualInput',
    'manualTagsInput',
    'teacherNames',
    'saveOverrideButton',
    'overrideMessage',
    'analysisModal',
    'analysisSummary',
    'analysisSheetInput',
    'analysisRemarksInput',
    'sheetTabs',
    'saveAnalysisButton',
    'analysisMessage',
    'analysisTableBody',
    'toast'
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  els.refreshButton.addEventListener('click', () => loadDashboard({ force: true }));
  els.syncButton.addEventListener('click', syncNow);
  els.settingsButton.addEventListener('click', openSettings);
  els.closeSettingsButton.addEventListener('click', closeSettings);
  els.saveSettingsButton.addEventListener('click', saveSettings);
  els.testConnectionButton.addEventListener('click', testConnection);
  els.searchInput.addEventListener('input', render);
  els.channelFilter.addEventListener('change', handleCascadeFilterChange);
  els.teacherFilter.addEventListener('change', render);
  els.dateFilter.addEventListener('change', handleDatePresetChange);
  els.fromDateFilter.addEventListener('change', handleCustomDateChange);
  els.toDateFilter.addEventListener('change', handleCustomDateChange);
  els.sortFilter.addEventListener('change', render);
  els.videoGrid.addEventListener('click', handleVideoGridClick);
  els.videoGrid.addEventListener('change', handleVideoGridChange);
  els.clearSelectionButton.addEventListener('click', clearSelection);
  els.analyzeButton.addEventListener('click', openAnalysisModal);
  els.playerModal.addEventListener('click', handleModalClick);
  els.analysisModal.addEventListener('click', handleAnalysisModalClick);
  els.miniPlayerButton.addEventListener('click', toggleMiniPlayer);
  els.fullscreenButton.addEventListener('click', requestPlayerFullscreen);
  els.saveOverrideButton.addEventListener('click', saveOverride);
  els.saveAnalysisButton.addEventListener('click', saveAnalysisReport);

  document.querySelectorAll('.type-tab').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.type-tab').forEach((tab) => tab.classList.remove('is-active'));
      button.classList.add('is-active');
      state.activeType = button.dataset.type;
      render();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.playerModal.hidden) {
      closePlayer();
    }
    if (event.key === 'Escape' && !els.analysisModal.hidden) {
      closeAnalysisModal();
    }
  });
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function hydrateSettings() {
  const url = new URL(window.location.href);
  const apiFromQuery = url.searchParams.get('api');
  const tokenFromQuery = url.searchParams.get('token');

  if (apiFromQuery) {
    state.apiUrl = apiFromQuery;
    localStorage.setItem('miniYoutubeApiUrl', apiFromQuery);
  }

  if (tokenFromQuery) {
    state.adminToken = tokenFromQuery;
    localStorage.setItem('miniYoutubeAdminToken', tokenFromQuery);
  }

  els.apiUrlInput.value = state.apiUrl === 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE' ? '' : state.apiUrl;
  els.adminTokenInput.value = state.adminToken;
}

async function loadDashboard(options = {}) {
  if (!hasApiUrl()) {
    openSettings();
    setSettingsMessage('Paste your Apps Script Web App URL, then save.', '');
    return;
  }

  showLoading('Loading dashboard...');

  try {
    const response = await apiGet('getDashboardData', {
      daysBack: 'all',
      t: options.force ? Date.now() : ''
    });

    if (!response.ok) {
      throw new Error(response.error || 'Dashboard request failed.');
    }

    state.channels = response.data.channels || [];
    state.teachers = response.data.teachers || [];
    state.sheetNames = response.data.sheetNames || [];
    state.videos = response.data.videos || [];
    pruneSelection();
    populateFilters();
    renderReferencePanels();
    renderTeacherDatalist();
    renderSheetDatalist();
    render();
    closeSettings();
  } catch (error) {
    showToast(error.message || String(error));
    openSettings();
    setSettingsMessage(error.message || String(error), 'error');
  } finally {
    hideLoading();
  }
}

function handleCustomDateChange() {
  if (els.fromDateFilter.value || els.toDateFilter.value) {
    els.dateFilter.value = 'custom';
  }
  handleCascadeFilterChange();
}

function handleDatePresetChange() {
  if (els.dateFilter.value !== 'custom') {
    els.fromDateFilter.value = '';
    els.toDateFilter.value = '';
  }
  handleCascadeFilterChange();
}

function handleCascadeFilterChange() {
  populateTeacherOptions();
  render();
}

function getBackendFilterParams() {
  const params = {};
  const selectedChannel = els.channelFilter.value || 'all';
  const fromDate = els.fromDateFilter.value;
  const toDate = els.toDateFilter.value;
  const datePreset = els.dateFilter.value || '7';

  if (selectedChannel !== 'all') {
    params.channelName = selectedChannel;
  }

  if (fromDate || toDate || datePreset === 'custom') {
    if (fromDate) {
      params.fromDate = fromDate;
    }
    if (toDate) {
      params.toDate = toDate;
    }
    params.daysBack = 'custom';
    return params;
  }

  params.daysBack = datePreset;
  return params;
}

async function syncNow() {
  if (!hasApiUrl()) {
    openSettings();
    return;
  }

  showLoading('Syncing latest YouTube videos...');

  try {
    const response = await apiWrite({
      action: 'syncNow',
      token: state.adminToken,
      daysBack: 30
    });

    if (!response.ok) {
      throw new Error(response.error || 'Sync failed.');
    }

    const total = response.data.totalNewVideos + response.data.totalUpdatedVideos;
    showToast(`Sync complete. ${total.toLocaleString()} video records changed.`);
    await loadDashboard({ force: true });
  } catch (error) {
    showToast(error.message || String(error));
  } finally {
    hideLoading();
  }
}

function populateFilters() {
  const currentChannel = els.channelFilter.value;

  els.channelFilter.innerHTML = [
    '<option value="all">All channels</option>',
    ...state.channels.map((channel) => `<option value="${escapeHtml(channel.channelName)}">${escapeHtml(channel.channelName)}</option>`)
  ].join('');
  els.channelFilter.value = currentChannel || 'all';
  if (!els.channelFilter.value) {
    els.channelFilter.value = 'all';
  }

  populateTeacherOptions();
}

function populateTeacherOptions() {
  const currentTeacher = els.teacherFilter.value;
  const selectedChannel = els.channelFilter.value || 'all';
  const teacherNames = unique(
    state.videos
      .filter((video) => selectedChannel === 'all' || video.channelName === selectedChannel)
      .map((video) => video.teacher)
      .filter(Boolean)
      .concat(
        state.teachers
          .filter((teacher) => {
            if (selectedChannel === 'all') {
              return true;
            }
            return teacher.channelName && teacher.channelName === selectedChannel;
          })
          .map((teacher) => teacher.teacherName)
          .filter(Boolean)
      )
  ).sort((a, b) => a.localeCompare(b));

  els.teacherFilter.innerHTML = [
    '<option value="all">All teachers</option>',
    '<option value="unassigned">Unassigned</option>',
    ...teacherNames.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
  ].join('');
  els.teacherFilter.value = currentTeacher || 'all';
  if (!els.teacherFilter.value) {
    els.teacherFilter.value = 'all';
  }
}

function renderReferencePanels() {
  els.channelCount.textContent = state.channels.length.toLocaleString();
  els.teacherCount.textContent = state.teachers.filter((teacher) => teacher.active).length.toLocaleString();

  els.channelList.innerHTML = state.channels.length
    ? state.channels.map((channel) => `<span class="pill">${escapeHtml(channel.channelName)}</span>`).join('')
    : '<span class="muted">No channels loaded</span>';

  const activeTeachers = state.teachers.filter((teacher) => teacher.active);
  els.teacherList.innerHTML = activeTeachers.length
    ? activeTeachers.map((teacher) => `<span class="pill">${escapeHtml(teacher.teacherName)}</span>`).join('')
    : '<span class="muted">Add teacher rules in the Teachers sheet</span>';
}

function renderTeacherDatalist() {
  const names = unique(
    state.teachers
      .map((teacher) => teacher.teacherName)
      .filter(Boolean)
      .concat(state.videos.map((video) => video.teacher).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  els.teacherNames.innerHTML = names.map((name) => `<option value="${escapeHtml(name)}"></option>`).join('');
}

function renderSheetDatalist() {
  const names = unique(state.sheetNames.filter(Boolean));
  const options = names.length ? names : ['Analysis'];
  const currentSheet = els.analysisSheetInput.value;
  els.analysisSheetInput.innerHTML = options
    .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    .join('');
  els.sheetTabs.innerHTML = options.map((name) => `<option value="${escapeHtml(name)}"></option>`).join('');
  els.analysisSheetInput.value = options.includes(currentSheet) ? currentSheet : options[0];
}

function render() {
  const query = normalize(els.searchInput.value);
  const channel = els.channelFilter.value || 'all';
  const teacher = els.teacherFilter.value || 'all';
  const dateRange = els.dateFilter.value || '7';
  const sort = els.sortFilter.value || 'newest';
  const cutoff = getCutoffDate(dateRange);
  const fromDate = els.fromDateFilter.value ? new Date(`${els.fromDateFilter.value}T00:00:00`) : null;
  const toDate = els.toDateFilter.value ? new Date(`${els.toDateFilter.value}T23:59:59`) : null;

  state.filtered = state.videos.filter((video) => {
    if (channel !== 'all' && video.channelName !== channel) {
      return false;
    }

    if (teacher === 'unassigned' && video.teacher) {
      return false;
    }

    if (teacher !== 'all' && teacher !== 'unassigned' && video.teacher !== teacher) {
      return false;
    }

    const published = new Date(video.publishedAt);

    if (cutoff && published < cutoff) {
      return false;
    }

    if (fromDate && published < fromDate) {
      return false;
    }

    if (toDate && published > toDate) {
      return false;
    }

    if (!matchesType(video, state.activeType)) {
      return false;
    }

    if (query) {
      const haystack = normalize([
        video.title,
        video.description,
        video.tags,
        video.teacher,
        video.channelName,
        video.manualTags
      ].join(' '));
      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });

  sortVideos(state.filtered, sort);
  renderStats(state.filtered);
  renderVideos(state.filtered);
  updateSelectionToolbar();
  els.resultHeading.textContent = `${state.filtered.length.toLocaleString()} video${state.filtered.length === 1 ? '' : 's'}`;
  const rangeText = getDateRangeLabel();
  els.lastUpdated.textContent = state.videos.length ? `Loaded ${state.videos.length.toLocaleString()} records from ${rangeText}` : '';
}

function renderStats(videos) {
  const totalViews = videos.reduce((sum, video) => sum + Number(video.viewCount || 0), 0);
  const shorts = videos.filter((video) => video.isShort).length;
  const live = videos.filter((video) => video.isLive || video.isPremiere).length;

  els.statTotal.textContent = videos.length.toLocaleString();
  els.statViews.textContent = compactNumber(totalViews);
  els.statShorts.textContent = shorts.toLocaleString();
  els.statLive.textContent = live.toLocaleString();
}

function renderVideos(videos) {
  els.emptyState.hidden = videos.length > 0;

  els.videoGrid.innerHTML = videos.map((video, index) => {
    const badge = getTypeBadge(video);
    const teacher = video.teacher ? `<span>Teacher: <strong>${escapeHtml(video.teacher)}</strong></span>` : '<span>Teacher: Unassigned</span>';
    const tags = video.manualTags
      ? String(video.manualTags).split(',').map((tag) => `<span class="manual-tag">${escapeHtml(tag.trim())}</span>`).join('')
      : '';
    const checked = state.selectedVideoIds.has(video.videoId) ? 'checked' : '';

    return `
      <article class="video-card" style="--card-delay: ${Math.min(index, 18) * 28}ms" data-video-id="${escapeHtml(video.videoId)}">
        <label class="select-video" title="Select for analysis">
          <input type="checkbox" data-select-video="${escapeHtml(video.videoId)}" ${checked}>
          <span><i data-lucide="check"></i></span>
        </label>
        <button class="thumb-button" type="button" data-play="${escapeHtml(video.videoId)}" aria-label="Play ${escapeHtml(video.title)}">
          <img src="${escapeAttribute(video.thumbnailUrl)}" alt="">
          <span class="play-badge"><i data-lucide="play"></i></span>
          <span class="type-badge ${badge.className}">${badge.label}</span>
        </button>
        <div class="video-body">
          <h3 class="video-title">${escapeHtml(video.title)}</h3>
          <div class="video-subline">
            <span>${escapeHtml(video.channelName)}</span>
            <span>${formatDate(video.publishedAt)}</span>
          </div>
          <div class="video-numbers">
            <span>${compactNumber(video.viewCount)} views</span>
            <span>${compactNumber(video.likeCount)} likes</span>
            <span>${compactNumber(video.commentCount)} comments</span>
          </div>
          <div class="video-teacher">${teacher}${tags}</div>
        </div>
      </article>
    `;
  }).join('');

  refreshIcons();
}

function handleVideoGridChange(event) {
  const checkbox = event.target.closest('[data-select-video]');
  if (!checkbox) {
    return;
  }

  const videoId = checkbox.dataset.selectVideo;
  if (checkbox.checked) {
    state.selectedVideoIds.add(videoId);
    if (!state.selectedVideoOrder.includes(videoId)) {
      state.selectedVideoOrder.push(videoId);
    }
  } else {
    state.selectedVideoIds.delete(videoId);
    state.selectedVideoOrder = state.selectedVideoOrder.filter((id) => id !== videoId);
  }

  updateSelectionToolbar();
}

function pruneSelection() {
  const loadedIds = new Set(state.videos.map((video) => video.videoId));
  state.selectedVideoIds.forEach((videoId) => {
    if (!loadedIds.has(videoId)) {
      state.selectedVideoIds.delete(videoId);
    }
  });
  state.selectedVideoOrder = state.selectedVideoOrder.filter((videoId) => loadedIds.has(videoId));
}

function clearSelection() {
  state.selectedVideoIds.clear();
  state.selectedVideoOrder = [];
  renderVideos(state.filtered);
  updateSelectionToolbar();
}

function updateSelectionToolbar() {
  const count = state.selectedVideoIds.size;
  els.selectedCount.textContent = `${count.toLocaleString()} selected`;
  els.analyzeButton.disabled = count === 0;
  els.clearSelectionButton.disabled = count === 0;
}

function handleVideoGridClick(event) {
  if (event.target.closest('[data-select-video]') || event.target.closest('.select-video')) {
    return;
  }

  const playButton = event.target.closest('[data-play]');
  if (!playButton) {
    return;
  }

  const videoId = playButton.dataset.play;
  const video = state.videos.find((item) => item.videoId === videoId);
  if (video) {
    openPlayer(video);
  }
}

function getSelectedVideos() {
  const videosById = new Map(state.videos.map((video) => [video.videoId, video]));
  return state.selectedVideoOrder
    .map((videoId) => videosById.get(videoId))
    .filter(Boolean);
}

function openAnalysisModal() {
  const videos = getSelectedVideos();
  if (!videos.length) {
    showToast('Select videos first.');
    return;
  }

  state.analysisVideos = videos;
  renderAnalysisReport(videos);
  if (els.analysisRemarksInput) {
    els.analysisRemarksInput.value = '';
  }
  els.analysisMessage.textContent = '';
  els.analysisMessage.className = 'form-message';
  els.analysisModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeAnalysisModal() {
  els.analysisModal.hidden = true;
  document.body.style.overflow = '';
}

function handleAnalysisModalClick(event) {
  if (event.target.closest('[data-close-analysis]')) {
    closeAnalysisModal();
  }
}

function renderAnalysisReport(videos) {
  const report = buildAnalysisReport(videos);

  els.analysisSummary.innerHTML = [
    summaryCard('Videos', report.count),
    summaryCard('Channels', report.channels.join(', ')),
    summaryCard('Faculty', report.teachers.join(', ')),
    summaryCard('Total views', compactNumber(report.totalViews)),
    summaryCard('Average views', compactNumber(report.averageViews)),
    summaryCard('Average likes', compactNumber(report.averageLikes)),
    summaryCard('Average comments', compactNumber(report.averageComments)),
    summaryCard('Top view video', report.topByViews ? report.topByViews.title : '-')
  ].join('');

  els.analysisTableBody.innerHTML = videos.map((video, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(video.channelName)}</td>
      <td>${escapeHtml(video.teacher || 'Unassigned')}</td>
      <td>${escapeHtml(video.title)}</td>
      <td><a href="${escapeAttribute(video.youtubeUrl)}" target="_blank" rel="noopener">Open Video</a></td>
      <td>${formatDate(video.publishedAt)}</td>
      <td>${escapeHtml(video.durationFormatted || '')}</td>
      <td>${escapeHtml(getTypeBadge(video).label)}</td>
      <td>${Number(video.viewCount || 0).toLocaleString('en-IN')}</td>
      <td>${Number(video.likeCount || 0).toLocaleString('en-IN')}</td>
      <td>${Number(video.commentCount || 0).toLocaleString('en-IN')}</td>
      <td>${Number((report.facultyAverages[video.teacher || 'Unassigned'] || {}).averageViews || 0).toLocaleString('en-IN')}</td>
      <td>${Number((report.facultyAverages[video.teacher || 'Unassigned'] || {}).averageLikes || 0).toLocaleString('en-IN')}</td>
      <td>${Number((report.facultyAverages[video.teacher || 'Unassigned'] || {}).averageComments || 0).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  refreshIcons();
}

function buildAnalysisReport(videos) {
  const totalViews = sumBy(videos, 'viewCount');
  const totalLikes = sumBy(videos, 'likeCount');
  const totalComments = sumBy(videos, 'commentCount');
  const channels = unique(videos.map((video) => video.channelName || 'Unknown')).sort((a, b) => a.localeCompare(b));
  const teachers = unique(videos.map((video) => video.teacher || 'Unassigned')).sort((a, b) => a.localeCompare(b));
  const facultyAverages = buildFacultyAverageMap(videos);

  return {
    count: videos.length,
    channels,
    teachers,
    totalViews,
    totalLikes,
    totalComments,
    averageViews: average(totalViews, videos.length),
    averageLikes: average(totalLikes, videos.length),
    averageComments: average(totalComments, videos.length),
    facultyAverages,
    topByViews: videos.slice().sort((a, b) => Number(b.viewCount || 0) - Number(a.viewCount || 0))[0],
    topByLikes: videos.slice().sort((a, b) => Number(b.likeCount || 0) - Number(a.likeCount || 0))[0]
  };
}

function buildFacultyAverageMap(videos) {
  return videos.reduce((groups, video) => {
    const faculty = video.teacher || 'Unassigned';
    if (!groups[faculty]) {
      groups[faculty] = {
        count: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0
      };
    }

    groups[faculty].count += 1;
    groups[faculty].totalViews += Number(video.viewCount || 0);
    groups[faculty].totalLikes += Number(video.likeCount || 0);
    groups[faculty].totalComments += Number(video.commentCount || 0);
    groups[faculty].averageViews = average(groups[faculty].totalViews, groups[faculty].count);
    groups[faculty].averageLikes = average(groups[faculty].totalLikes, groups[faculty].count);
    groups[faculty].averageComments = average(groups[faculty].totalComments, groups[faculty].count);
    return groups;
  }, {});
}

function summaryCard(label, value) {
  return `
    <article>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

async function saveAnalysisReport() {
  if (!state.analysisVideos.length) {
    showToast('No analysis report is open.');
    return;
  }

  const targetSheetName = els.analysisSheetInput.value.trim() || 'Analysis';
  els.saveAnalysisButton.disabled = true;
  setAnalysisMessage('Writing report to Google Sheet...', '');

  try {
    const response = await apiWrite({
      action: 'saveAnalysisReport',
      token: state.adminToken,
      targetSheetName,
      remarks: els.analysisRemarksInput ? els.analysisRemarksInput.value.trim() : '',
      videoIds: state.analysisVideos.map((video) => video.videoId).join(',')
    });

    if (!response.ok) {
      throw new Error(response.error || 'Could not write analysis report.');
    }

    setAnalysisMessage(`Saved to "${response.data.sheetName}" at row ${response.data.startRow}.`, 'success');
    state.sheetNames = unique([...state.sheetNames, response.data.sheetName]);
    renderSheetDatalist();
    state.analysisVideos = [];
    if (els.analysisRemarksInput) {
      els.analysisRemarksInput.value = '';
    }
    clearSelection();
    closeAnalysisModal();
    showToast('Analysis report saved to Google Sheet.');
  } catch (error) {
    setAnalysisMessage(error.message || String(error), 'error');
  } finally {
    els.saveAnalysisButton.disabled = false;
  }
}

function openPlayer(video) {
  state.activeVideo = video;
  const card = els.playerModal.querySelector('.player-card');
  card.classList.remove('is-mini');
  els.playerModal.classList.remove('is-mini-mode');

  els.modalChannel.textContent = video.channelName || 'Channel';
  els.modalTitle.textContent = video.title || 'Video';
  els.modalViews.textContent = `${compactNumber(video.viewCount)} views`;
  els.modalPublished.textContent = formatDate(video.publishedAt);
  els.modalDuration.textContent = video.durationFormatted || '';
  els.teacherManualInput.value = video.teacherManual || '';
  els.manualTagsInput.value = video.manualTags || '';
  els.overrideMessage.textContent = '';
  els.overrideMessage.className = 'form-message';
  els.youtubeFrame.src = `https://www.youtube.com/embed/${encodeURIComponent(video.videoId)}?autoplay=1&rel=0`;
  els.playerModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closePlayer() {
  els.youtubeFrame.src = '';
  els.playerModal.hidden = true;
  els.playerModal.classList.remove('is-mini-mode');
  state.activeVideo = null;
  document.body.style.overflow = '';
}

function handleModalClick(event) {
  if (event.target.closest('[data-close-modal]')) {
    closePlayer();
  }
}

function toggleMiniPlayer() {
  const card = els.playerModal.querySelector('.player-card');
  const isMini = card.classList.toggle('is-mini');
  els.playerModal.classList.toggle('is-mini-mode', isMini);
  document.body.style.overflow = isMini ? '' : 'hidden';
}

function requestPlayerFullscreen() {
  const target = els.playerFrameWrap;
  if (target.requestFullscreen) {
    target.requestFullscreen();
  }
}

async function saveOverride() {
  if (!state.activeVideo) {
    return;
  }

  els.saveOverrideButton.disabled = true;
  setOverrideMessage('Saving...', '');

  try {
    const response = await apiWrite({
      action: 'saveVideoOverride',
      token: state.adminToken,
      videoId: state.activeVideo.videoId,
      teacherManual: els.teacherManualInput.value,
      manualTags: els.manualTagsInput.value
    });

    if (!response.ok) {
      throw new Error(response.error || 'Save failed.');
    }

    const updated = response.data;
    state.videos = state.videos.map((video) => {
      if (video.videoId !== updated.videoId) {
        return video;
      }
      return {
        ...video,
        teacherManual: updated.teacherManual,
        teacher: updated.teacher,
        manualTags: updated.manualTags
      };
    });

    state.activeVideo = state.videos.find((video) => video.videoId === updated.videoId);
    populateFilters();
    renderReferencePanels();
    renderTeacherDatalist();
    render();
    setOverrideMessage('Saved.', 'success');
  } catch (error) {
    setOverrideMessage(error.message || String(error), 'error');
  } finally {
    els.saveOverrideButton.disabled = false;
  }
}

function openSettings() {
  els.settingsPanel.hidden = false;
  els.apiUrlInput.value = state.apiUrl === 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE' ? '' : state.apiUrl;
  els.adminTokenInput.value = state.adminToken;
  els.apiUrlInput.focus();
}

function closeSettings() {
  els.settingsPanel.hidden = true;
}

function saveSettings() {
  state.apiUrl = els.apiUrlInput.value.trim() || DEFAULT_API_URL;
  state.adminToken = els.adminTokenInput.value.trim();
  localStorage.setItem('miniYoutubeApiUrl', state.apiUrl);
  localStorage.setItem('miniYoutubeAdminToken', state.adminToken);
  setSettingsMessage('Saved.', 'success');
  loadDashboard({ force: true });
}

async function testConnection() {
  state.apiUrl = els.apiUrlInput.value.trim() || DEFAULT_API_URL;
  state.adminToken = els.adminTokenInput.value.trim();

  if (!hasApiUrl()) {
    setSettingsMessage('Add the Apps Script Web App URL first.', 'error');
    return;
  }

  setSettingsMessage('Testing...', '');

  try {
    const response = await apiGet('health', { t: Date.now() });
    if (!response.ok) {
      throw new Error(response.error || 'Health check failed.');
    }
    setSettingsMessage(`Connected to ${response.app || 'Apps Script'}.`, 'success');
  } catch (error) {
    setSettingsMessage(error.message || String(error), 'error');
  }
}

function hasApiUrl() {
  return state.apiUrl &&
    state.apiUrl !== 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE' &&
    /^https?:\/\//.test(state.apiUrl);
}

async function apiGet(action, params = {}) {
  const url = new URL(state.apiUrl);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    return apiJsonp(action, params);
  }
}

async function apiPost(payload) {
  const response = await fetch(state.apiUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function apiWrite(payload) {
  try {
    return await apiPost(payload);
  } catch (error) {
    const params = { ...payload };
    const action = params.action;
    delete params.action;
    return apiGet(action, params);
  }
}

function apiJsonp(action, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `miniYoutubeJsonp_${Date.now()}_${Math.round(Math.random() * 100000)}`;
    const url = new URL(state.apiUrl);
    url.searchParams.set('action', action);
    url.searchParams.set('callback', callbackName);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });

    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Connection timed out.'));
    }, 18000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Unable to load Apps Script endpoint.'));
    };

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

function matchesType(video, type) {
  if (type === 'all') {
    return true;
  }
  if (type === 'shorts') {
    return Boolean(video.isShort);
  }
  if (type === 'live') {
    return Boolean(video.isLive || video.isPremiere);
  }
  if (type === 'long') {
    return !video.isShort && !video.isLive && !video.isPremiere;
  }
  return true;
}

function sortVideos(videos, sort) {
  const sorters = {
    newest: (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
    oldest: (a, b) => new Date(a.publishedAt) - new Date(b.publishedAt),
    mostViewed: (a, b) => Number(b.viewCount || 0) - Number(a.viewCount || 0),
    mostLiked: (a, b) => Number(b.likeCount || 0) - Number(a.likeCount || 0)
  };
  videos.sort(sorters[sort] || sorters.newest);
}

function getCutoffDate(dateRange) {
  if (dateRange === 'all' || dateRange === 'custom') {
    return null;
  }
  const days = Number(dateRange || 30);
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function getDateRangeLabel() {
  const datePreset = els.dateFilter.value || '7';
  const fromDate = els.fromDateFilter.value;
  const toDate = els.toDateFilter.value;

  if (fromDate || toDate || datePreset === 'custom') {
    if (fromDate && toDate) {
      return `${fromDate} to ${toDate}`;
    }
    if (fromDate) {
      return `from ${fromDate}`;
    }
    if (toDate) {
      return `until ${toDate}`;
    }
    return 'custom range';
  }

  if (datePreset === 'all') {
    return 'all time';
  }

  return `last ${datePreset} days`;
}

function getTypeBadge(video) {
  if (video.isLive || video.isPremiere) {
    return { label: video.isPremiere ? 'Premiere' : 'Live', className: 'live' };
  }
  if (video.isShort) {
    return { label: 'Short', className: 'short' };
  }
  return { label: 'Long', className: 'long' };
}

function showLoading(message) {
  els.loadingText.textContent = message || 'Loading...';
  els.loadingOverlay.hidden = false;
}

function hideLoading() {
  els.loadingOverlay.hidden = true;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 4200);
}

function setSettingsMessage(message, type) {
  els.settingsMessage.textContent = message || '';
  els.settingsMessage.className = `form-message ${type || ''}`.trim();
}

function setOverrideMessage(message, type) {
  els.overrideMessage.textContent = message || '';
  els.overrideMessage.className = `form-message ${type || ''}`.trim();
}

function setAnalysisMessage(message, type) {
  els.analysisMessage.textContent = message || '';
  els.analysisMessage.className = `form-message ${type || ''}`.trim();
}

function compactNumber(value) {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function sumBy(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function average(total, count) {
  return count ? Math.round((Number(total || 0) / count) * 100) / 100 : 0;
}

function unique(items) {
  return [...new Set(items)];
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
