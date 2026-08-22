const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzmbmCQHRHzJrNd016qxv7M1glwFvm3-R4wiHBHcC2D9hYh19rp08uv7JwwApMtLHUlWQ/exec';
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
  analysisVideos: [],
  bulkGroups: [],
  bulkMissing: [],
  bulkSelectionKeys: new Set(),
  bulkSkippedVideoIds: new Set(),
  teacherCandidates: []
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
    'updateTeachersButton',
    'bulkUpdateButton',
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
    'bulkUpdateModal',
    'bulkFromDate',
    'bulkToDate',
    'bulkPreviewButton',
    'bulkApplyReviewButton',
    'bulkSkipAllMissingButton',
    'bulkWriteButton',
    'bulkMessage',
    'bulkSummary',
    'bulkMissingSection',
    'bulkMissingList',
    'bulkGroupsSection',
    'bulkGroupsList',
    'bulkSelectedCount',
    'teacherUpdateModal',
    'teacherFromDate',
    'teacherToDate',
    'teacherPreviewButton',
    'teacherUpdateSubmitButton',
    'teacherUpdateMessage',
    'teacherUpdateSummary',
    'teacherCandidatesSection',
    'teacherCandidatesList',
    'teacherSelectAll',
    'toast'
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  els.updateTeachersButton.addEventListener('click', openTeacherUpdate);
  els.bulkUpdateButton.addEventListener('click', openBulkUpdate);
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
  els.bulkUpdateModal.addEventListener('click', handleBulkModalClick);
  els.bulkPreviewButton.addEventListener('click', () => loadBulkPreview());
  els.bulkApplyReviewButton.addEventListener('click', applyBulkMetadataReview);
  els.bulkSkipAllMissingButton.addEventListener('click', skipAllMissingBulkVideos);
  els.bulkWriteButton.addEventListener('click', writeBulkReports);
  els.bulkGroupsList.addEventListener('change', handleBulkSelectionChange);
  els.teacherUpdateModal.addEventListener('click', handleTeacherUpdateModalClick);
  els.teacherPreviewButton.addEventListener('click', loadTeacherDiscoveryPreview);
  els.teacherUpdateSubmitButton.addEventListener('click', submitTeacherUpdates);
  els.teacherCandidatesList.addEventListener('change', updateTeacherCandidateSelectionState);
  els.teacherSelectAll.addEventListener('change', toggleAllTeacherCandidates);

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
    if (event.key === 'Escape' && !els.bulkUpdateModal.hidden) {
      closeBulkUpdate();
    }
    if (event.key === 'Escape' && !els.teacherUpdateModal.hidden) {
      closeTeacherUpdate();
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

function openTeacherUpdate() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 29);

  state.teacherCandidates = [];
  els.teacherFromDate.value = formatDateInput(thirtyDaysAgo);
  els.teacherToDate.value = formatDateInput(today);
  els.teacherUpdateSummary.hidden = true;
  els.teacherCandidatesSection.hidden = true;
  els.teacherCandidatesList.innerHTML = '';
  els.teacherUpdateSubmitButton.disabled = true;
  els.teacherSelectAll.checked = true;
  els.teacherSelectAll.indeterminate = false;
  setTeacherUpdateMessage('Select a date range to discover teacher names from video titles and manual overrides.', '');
  els.teacherUpdateModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeTeacherUpdate() {
  els.teacherUpdateModal.hidden = true;
  document.body.style.overflow = '';
}

function handleTeacherUpdateModalClick(event) {
  if (event.target.closest('[data-close-teachers]')) {
    closeTeacherUpdate();
  }
}

async function loadTeacherDiscoveryPreview() {
  const fromDate = els.teacherFromDate.value;
  const toDate = els.teacherToDate.value;

  if (!fromDate || !toDate) {
    setTeacherUpdateMessage('Select both From and To dates.', 'error');
    return;
  }
  if (fromDate > toDate) {
    setTeacherUpdateMessage('From date cannot be after To date.', 'error');
    return;
  }

  els.teacherPreviewButton.disabled = true;
  els.teacherUpdateSubmitButton.disabled = true;
  setTeacherUpdateMessage('Scanning video titles for teacher candidates...', '');

  try {
    const response = await apiWrite({
      action: 'getTeacherDiscoveryPreview',
      token: state.adminToken,
      fromDate,
      toDate
    });

    if (!response.ok) {
      throw new Error(response.error || 'Could not discover teachers.');
    }

    const preview = response.data || {};
    state.teacherCandidates = preview.candidates || [];
    renderTeacherDiscoveryPreview(preview);
  } catch (error) {
    setTeacherUpdateMessage(error.message || String(error), 'error');
  } finally {
    els.teacherPreviewButton.disabled = false;
  }
}

function renderTeacherDiscoveryPreview(preview) {
  const existingCount = state.teacherCandidates.filter((candidate) => candidate.existing).length;
  const newCount = state.teacherCandidates.length - existingCount;

  els.teacherUpdateSummary.hidden = false;
  els.teacherUpdateSummary.innerHTML = [
    summaryCard('Videos scanned', Number(preview.scannedVideos || 0).toLocaleString()),
    summaryCard('Candidates', state.teacherCandidates.length.toLocaleString()),
    summaryCard('Existing teachers', existingCount.toLocaleString()),
    summaryCard('New teachers', newCount.toLocaleString())
  ].join('');

  els.teacherCandidatesSection.hidden = state.teacherCandidates.length === 0;
  els.teacherCandidatesList.innerHTML = state.teacherCandidates.map((candidate, index) => `
    <article class="teacher-candidate-card" data-teacher-candidate="${index}">
      <div class="teacher-candidate-select">
        <label>
          <input type="checkbox" data-teacher-select checked>
          <span>${candidate.existing ? 'Update' : 'Add'}</span>
        </label>
        <span class="teacher-status-badge ${candidate.existing ? 'existing' : 'new'}">${candidate.existing ? 'Existing' : 'New'}</span>
      </div>
      <div class="teacher-candidate-fields">
        <label class="stacked-label">
          <span>Teacher name</span>
          <input type="text" data-teacher-name value="${escapeAttribute(candidate.teacherName)}">
        </label>
        <label class="stacked-label teacher-keywords-field">
          <span>Keywords, separated with |</span>
          <input type="text" data-teacher-keywords value="${escapeAttribute(candidate.keywords)}">
        </label>
        <label class="stacked-label">
          <span>Parent channel</span>
          <input type="text" data-teacher-parent value="${escapeAttribute(candidate.parentChannelName)}" readonly>
        </label>
        <label class="stacked-label teacher-priority-field">
          <span>Priority</span>
          <input type="number" data-teacher-priority min="0" step="1" value="${Number(candidate.priority || 50)}">
        </label>
        <label class="teacher-active-option">
          <input type="checkbox" data-teacher-active ${candidate.active ? 'checked' : ''}>
          <span>Active</span>
        </label>
      </div>
      <div class="teacher-candidate-evidence">
        <span><strong>${Number(candidate.videoCount || 0).toLocaleString()}</strong> matching video(s)</span>
        <span>Channels: ${escapeHtml((candidate.channelNames || []).join(', ') || candidate.parentChannelName || '-')}</span>
        <details>
          <summary>Show sample titles</summary>
          <ul>${(candidate.sampleTitles || []).map((title) => `<li>${escapeHtml(title)}</li>`).join('')}</ul>
        </details>
      </div>
    </article>
  `).join('');

  if (state.teacherCandidates.length) {
    setTeacherUpdateMessage('Review the suggestions. Existing keywords will be merged; no teacher rows will be deleted.', 'success');
  } else {
    setTeacherUpdateMessage('No teacher candidates were detected in this date range.', '');
  }

  updateTeacherCandidateSelectionState();
}

function toggleAllTeacherCandidates() {
  const checked = els.teacherSelectAll.checked;
  els.teacherCandidatesList.querySelectorAll('[data-teacher-select]').forEach((checkbox) => {
    checkbox.checked = checked;
  });
  updateTeacherCandidateSelectionState();
}

function updateTeacherCandidateSelectionState() {
  const checkboxes = [...els.teacherCandidatesList.querySelectorAll('[data-teacher-select]')];
  const selected = checkboxes.filter((checkbox) => checkbox.checked).length;
  els.teacherSelectAll.checked = checkboxes.length > 0 && selected === checkboxes.length;
  els.teacherSelectAll.indeterminate = selected > 0 && selected < checkboxes.length;
  els.teacherUpdateSubmitButton.disabled = selected === 0;
  els.teacherUpdateSubmitButton.querySelector('span').textContent = selected
    ? `Update ${selected.toLocaleString()} Selected`
    : 'Update Selected Teachers';
}

function collectSelectedTeacherCandidates() {
  const selected = [];
  els.teacherCandidatesList.querySelectorAll('.teacher-candidate-card').forEach((card) => {
    if (!card.querySelector('[data-teacher-select]').checked) {
      return;
    }

    const original = state.teacherCandidates[Number(card.dataset.teacherCandidate)];
    selected.push({
      teacherName: card.querySelector('[data-teacher-name]').value.trim(),
      keywords: card.querySelector('[data-teacher-keywords]').value.trim(),
      channelName: original.channelName || '',
      channelNames: (original.channelNames || []).join('|'),
      parentChannelName: card.querySelector('[data-teacher-parent]').value.trim(),
      active: card.querySelector('[data-teacher-active]').checked,
      priority: Number(card.querySelector('[data-teacher-priority]').value || 50),
      notes: original.notes || '',
      existingRowNumber: original.existingRowNumber || ''
    });
  });
  return selected;
}

async function submitTeacherUpdates() {
  const candidates = collectSelectedTeacherCandidates();
  if (!candidates.length) {
    setTeacherUpdateMessage('Select at least one teacher candidate.', 'error');
    return;
  }
  if (candidates.some((candidate) => !candidate.teacherName || !candidate.keywords)) {
    setTeacherUpdateMessage('Every selected candidate needs a teacher name and at least one keyword.', 'error');
    return;
  }

  els.teacherUpdateSubmitButton.disabled = true;
  setTeacherUpdateMessage('Updating the Teachers tab and refreshing video assignments...', '');

  try {
    const response = await apiWrite({
      action: 'updateTeachers',
      token: state.adminToken,
      candidates: JSON.stringify(candidates)
    });

    if (!response.ok) {
      throw new Error(response.error || 'Could not update the Teachers tab.');
    }

    const result = response.data || {};
    closeTeacherUpdate();
    showToast(`Teachers updated: ${result.inserted || 0} added, ${result.updated || 0} updated.`);
    await loadDashboard({ force: true });
  } catch (error) {
    setTeacherUpdateMessage(error.message || String(error), 'error');
    updateTeacherCandidateSelectionState();
  }
}

function openBulkUpdate() {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);

  state.bulkGroups = [];
  state.bulkMissing = [];
  state.bulkSelectionKeys.clear();
  state.bulkSkippedVideoIds.clear();
  els.bulkFromDate.value = formatDateInput(sevenDaysAgo);
  els.bulkToDate.value = formatDateInput(today);
  els.bulkSummary.hidden = true;
  els.bulkMissingSection.hidden = true;
  els.bulkGroupsSection.hidden = true;
  els.bulkWriteButton.disabled = true;
  setBulkMessage('Select the reporting range, then generate a preview.', '');
  els.bulkUpdateModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeBulkUpdate() {
  els.bulkUpdateModal.hidden = true;
  document.body.style.overflow = '';
}

function handleBulkModalClick(event) {
  if (event.target.closest('[data-close-bulk]')) {
    closeBulkUpdate();
  }
}

async function loadBulkPreview(options = {}) {
  const fromDate = els.bulkFromDate.value;
  const toDate = els.bulkToDate.value;

  if (!fromDate || !toDate) {
    setBulkMessage('Select both From and To dates.', 'error');
    return;
  }

  if (fromDate > toDate) {
    setBulkMessage('From date cannot be after To date.', 'error');
    return;
  }

  els.bulkPreviewButton.disabled = true;
  els.bulkApplyReviewButton.disabled = true;
  els.bulkWriteButton.disabled = true;
  setBulkMessage('Building report preview...', '');

  try {
    const response = await apiWrite({
      action: 'getMagicPreview',
      token: state.adminToken,
      fromDate,
      toDate,
      skipVideoIds: [...state.bulkSkippedVideoIds].join(','),
      assignments: JSON.stringify(options.assignments || [])
    });

    if (!response.ok) {
      throw new Error(response.error || 'Could not generate the bulk preview.');
    }

    const preview = response.data || {};
    state.bulkGroups = preview.groups || [];
    state.bulkMissing = preview.missing || [];
    state.bulkSelectionKeys = new Set();

    state.bulkGroups.forEach((group) => {
      (group.videos || []).forEach((video) => {
        state.bulkSelectionKeys.add(makeBulkSelectionKey(group.exam, video.videoId));
      });
    });

    renderBulkPreview(preview);
  } catch (error) {
    setBulkMessage(error.message || String(error), 'error');
  } finally {
    els.bulkPreviewButton.disabled = false;
    els.bulkApplyReviewButton.disabled = false;
  }
}

function renderBulkPreview(preview) {
  const exams = unique(state.bulkGroups.map((group) => group.exam).filter(Boolean));
  const placements = state.bulkGroups.reduce((total, group) => total + (group.videos || []).length, 0);

  els.bulkSummary.hidden = false;
  els.bulkSummary.innerHTML = [
    summaryCard('Date range', `${formatDate(preview.fromDate)} – ${formatDate(preview.toDate)}`),
    summaryCard('Exam tabs', exams.length),
    summaryCard('Report rows', state.bulkGroups.length),
    summaryCard('Video placements', placements)
  ].join('');

  renderBulkMissing();
  renderBulkGroups();

  if (state.bulkMissing.length) {
    setBulkMessage(`${state.bulkMissing.length} video(s) need metadata or must be skipped before writing.`, 'error');
  } else if (!state.bulkGroups.length) {
    setBulkMessage('No eligible long-form class videos were found in this date range.', 'error');
  } else {
    setBulkMessage('Preview ready. Deselect unwanted videos, then append the reports.', 'success');
  }

  updateBulkSelectionCount();
}

function renderBulkMissing() {
  els.bulkMissingSection.hidden = state.bulkMissing.length === 0;
  if (!state.bulkMissing.length) {
    els.bulkMissingList.innerHTML = '';
    return;
  }

  els.bulkMissingList.innerHTML = state.bulkMissing.map((video) => {
    const examOptions = video.examOptions || [];
    const detectedExams = video.exams || [];
    const examControl = detectedExams.length
      ? `<input type="text" data-bulk-exam value="${escapeAttribute(detectedExams.join(', '))}" readonly>`
      : `<select data-bulk-exam>
          <option value="">Select exam</option>
          ${examOptions.map((exam) => `<option value="${escapeHtml(exam)}">${escapeHtml(exam)}</option>`).join('')}
        </select>`;

    return `
      <article class="bulk-missing-row" data-video-id="${escapeHtml(video.videoId)}" data-has-detected-exams="${detectedExams.length ? 'true' : 'false'}">
        <div class="bulk-video-copy">
          <a href="https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}" target="_blank" rel="noopener">${escapeHtml(video.title)}</a>
          <span>${escapeHtml(video.channelName)} · ${formatDate(video.publishedAt)}</span>
        </div>
        <label class="stacked-label">
          <span>Faculty</span>
          <input type="text" data-bulk-teacher list="teacherNames" value="${escapeAttribute(video.teacher || '')}" placeholder="Faculty name">
        </label>
        <label class="stacked-label">
          <span>Exam</span>
          ${examControl}
        </label>
        <label class="stacked-label">
          <span>Subject</span>
          <input type="text" data-bulk-subject value="${escapeAttribute(video.subject || '')}" placeholder="Optional subject">
        </label>
        <label class="bulk-skip-option">
          <input type="checkbox" data-bulk-skip>
          <span>Skip for this report</span>
        </label>
      </article>
    `;
  }).join('');
}

async function applyBulkMetadataReview() {
  const assignments = [];
  const rows = [...els.bulkMissingList.querySelectorAll('.bulk-missing-row')];

  for (const row of rows) {
    const videoId = row.dataset.videoId;
    const skip = row.querySelector('[data-bulk-skip]').checked;

    if (skip) {
      state.bulkSkippedVideoIds.add(videoId);
      continue;
    }

    const teacherManual = row.querySelector('[data-bulk-teacher]').value.trim();
    const examManual = row.querySelector('[data-bulk-exam]').value;
    const subjectManual = row.querySelector('[data-bulk-subject]').value.trim();

    if (!teacherManual || !examManual) {
      setBulkMessage('Every reviewed video needs a faculty and exam, or must be skipped.', 'error');
      return;
    }

    const assignment = { videoId, teacherManual, subjectManual };
    if (row.dataset.hasDetectedExams !== 'true') {
      assignment.examManual = examManual;
    }
    assignments.push(assignment);
  }

  await loadBulkPreview({ assignments });
}

async function skipAllMissingBulkVideos() {
  if (!state.bulkMissing.length) {
    return;
  }

  state.bulkMissing.forEach((video) => {
    if (video.videoId) {
      state.bulkSkippedVideoIds.add(video.videoId);
    }
  });

  els.bulkSkipAllMissingButton.disabled = true;
  setBulkMessage(`Skipping ${state.bulkMissing.length} metadata-missing video(s) for this report...`, '');

  try {
    await loadBulkPreview();
  } finally {
    els.bulkSkipAllMissingButton.disabled = false;
  }
}

function renderBulkGroups() {
  els.bulkGroupsSection.hidden = state.bulkGroups.length === 0;
  if (!state.bulkGroups.length) {
    els.bulkGroupsList.innerHTML = '';
    return;
  }

  els.bulkGroupsList.innerHTML = state.bulkGroups.map((group, groupIndex) => `
    <article class="bulk-group-card">
      <div class="bulk-group-header">
        <label class="bulk-group-toggle">
          <input type="checkbox" data-bulk-group-index="${groupIndex}" checked>
          <span>Select group</span>
        </label>
        <div>
          <strong>${escapeHtml(group.exam)} · ${escapeHtml(group.teacher)}</strong>
          <span>${escapeHtml(group.subject || 'Subject unassigned')} · ${escapeHtml(group.parentChannelName)}</span>
        </div>
        <span>${(group.videos || []).length} video(s) · Avg. ${compactNumber(group.averageViews)} views</span>
      </div>
      <div class="bulk-video-list">
        ${(group.videos || []).map((video, videoIndex) => `
          <label class="bulk-video-row">
            <input type="checkbox" data-bulk-group="${groupIndex}" data-bulk-video="${videoIndex}" checked>
            <span class="bulk-video-check"><i data-lucide="check"></i></span>
            <span class="bulk-video-copy">
              <strong>${escapeHtml(video.title)}</strong>
              <small>${formatDate(video.publishedAt)} · ${compactNumber(video.viewCount)} views</small>
            </span>
            <a href="${escapeAttribute(video.youtubeUrl)}" target="_blank" rel="noopener" title="Open video">Open</a>
          </label>
        `).join('')}
      </div>
    </article>
  `).join('');

  refreshIcons();
  syncBulkGroupCheckboxes();
}

function handleBulkSelectionChange(event) {
  const groupToggle = event.target.closest('[data-bulk-group-index]');
  if (groupToggle) {
    const groupIndex = Number(groupToggle.dataset.bulkGroupIndex);
    const group = state.bulkGroups[groupIndex];
    (group.videos || []).forEach((video) => {
      const key = makeBulkSelectionKey(group.exam, video.videoId);
      if (groupToggle.checked) {
        state.bulkSelectionKeys.add(key);
      } else {
        state.bulkSelectionKeys.delete(key);
      }
    });
    els.bulkGroupsList.querySelectorAll(`[data-bulk-group="${groupIndex}"]`).forEach((checkbox) => {
      checkbox.checked = groupToggle.checked;
    });
  }

  const videoToggle = event.target.closest('[data-bulk-video]');
  if (videoToggle) {
    const group = state.bulkGroups[Number(videoToggle.dataset.bulkGroup)];
    const video = group.videos[Number(videoToggle.dataset.bulkVideo)];
    const key = makeBulkSelectionKey(group.exam, video.videoId);
    if (videoToggle.checked) {
      state.bulkSelectionKeys.add(key);
    } else {
      state.bulkSelectionKeys.delete(key);
    }
  }

  syncBulkGroupCheckboxes();
  updateBulkSelectionCount();
}

function syncBulkGroupCheckboxes() {
  els.bulkGroupsList.querySelectorAll('[data-bulk-group-index]').forEach((checkbox) => {
    const group = state.bulkGroups[Number(checkbox.dataset.bulkGroupIndex)];
    const selected = (group.videos || []).filter((video) => (
      state.bulkSelectionKeys.has(makeBulkSelectionKey(group.exam, video.videoId))
    )).length;
    checkbox.checked = selected === group.videos.length;
    checkbox.indeterminate = selected > 0 && selected < group.videos.length;
  });
}

function updateBulkSelectionCount() {
  const count = state.bulkSelectionKeys.size;
  els.bulkSelectedCount.textContent = count.toLocaleString();
  els.bulkWriteButton.disabled = state.bulkMissing.length > 0 || count === 0 || state.bulkGroups.length === 0;
}

function makeBulkSelectionKey(exam, videoId) {
  return `${exam || ''}||${videoId || ''}`;
}

function getBulkSelections() {
  const selections = [];
  state.bulkGroups.forEach((group) => {
    (group.videos || []).forEach((video) => {
      if (state.bulkSelectionKeys.has(makeBulkSelectionKey(group.exam, video.videoId))) {
        selections.push({ exam: group.exam, videoId: video.videoId });
      }
    });
  });
  return selections;
}

async function writeBulkReports() {
  const selections = getBulkSelections();
  if (!selections.length || state.bulkMissing.length) {
    setBulkMessage('Complete the review and select at least one video before writing.', 'error');
    return;
  }

  els.bulkWriteButton.disabled = true;
  setBulkMessage('Appending report rows to the exam tabs...', '');

  try {
    const response = await apiWrite({
      action: 'writeMagicReport',
      token: state.adminToken,
      fromDate: els.bulkFromDate.value,
      toDate: els.bulkToDate.value,
      skipVideoIds: [...state.bulkSkippedVideoIds].join(','),
      selections: JSON.stringify(selections)
    });

    if (!response.ok) {
      throw new Error(response.error || 'Could not append the bulk reports.');
    }

    if (response.data.needsReview) {
      state.bulkMissing = response.data.missing || [];
      renderBulkMissing();
      throw new Error('Some videos changed and now need review. Review them before writing.');
    }

    const sheetSummary = (response.data.sheets || [])
      .map((sheet) => `${sheet.sheetName}: ${sheet.rows}`)
      .join(', ');
    setBulkMessage(`Appended ${response.data.writtenRows} row(s). ${sheetSummary}`, 'success');
    showToast('Bulk reports appended successfully.');
    state.bulkSelectionKeys.clear();
    updateBulkSelectionCount();
  } catch (error) {
    setBulkMessage(error.message || String(error), 'error');
    updateBulkSelectionCount();
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

function setBulkMessage(message, type) {
  els.bulkMessage.textContent = message || '';
  els.bulkMessage.className = `form-message ${type || ''}`.trim();
}

function setTeacherUpdateMessage(message, type) {
  els.teacherUpdateMessage.textContent = message || '';
  els.teacherUpdateMessage.className = `form-message ${type || ''}`.trim();
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

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
