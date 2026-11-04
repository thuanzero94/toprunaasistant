'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type NavTab =
  | 'dashboard'
  | 'tournaments'
  | 'events'
  | 'tracklogs'
  | 'trophy'
  | 'clubs'
  | 'account'
  | 'admin';

export type TournamentSubTab = 'my-events' | 'explore' | 'detail';
export type TracklogViewMode = 'list' | 'detail';
export type AppModal =
  | 'ebib'
  | 'register'
  | 'participant'
  | 'create-event'
  | 'share'
  | 'simulator';

export interface NavigationState {
  activeTab: NavTab;
  runnerEventSubTab: TournamentSubTab;
  selectedEventId: string;
  tournamentFrom: 'my-events' | 'explore' | 'dashboard';
  tracklogViewMode: TracklogViewMode;
  selectedActivityId: string;
  activeModal: AppModal | null;
}

interface UseAppNavigationProps {
  defaultEventId?: string;
  defaultActivityId?: string;
}

export function useAppNavigation({
  defaultEventId = 'evt_vr_2026',
  defaultActivityId = 'act_01',
}: UseAppNavigationProps = {}) {
  const [activeTab, setActiveTabState] = useState<NavTab>('dashboard');
  const [runnerEventSubTab, setRunnerEventSubTabState] = useState<TournamentSubTab>('my-events');
  const [selectedEventId, setSelectedEventIdState] = useState<string>(defaultEventId);
  const [tournamentFrom, setTournamentFromState] = useState<'my-events' | 'explore' | 'dashboard'>('explore');
  const [tracklogViewMode, setTracklogViewModeState] = useState<TracklogViewMode>('list');
  const [selectedActivityId, setSelectedActivityIdState] = useState<string>(defaultActivityId);
  const [activeModal, setActiveModalState] = useState<AppModal | null>(null);

  const isInitialMount = useRef(true);

  // Helper to build URL query string from state
  const buildSearchString = useCallback(
    (state: {
      tab: NavTab;
      subTab?: TournamentSubTab;
      eventId?: string;
      from?: 'my-events' | 'explore' | 'dashboard';
      view?: TracklogViewMode;
      activityId?: string;
      modal?: AppModal | null;
    }) => {
      const sp = new URLSearchParams();
      if (state.tab && state.tab !== 'dashboard') {
        sp.set('tab', state.tab === 'events' ? 'tournaments' : state.tab);
      }

      if (state.tab === 'tournaments' || state.tab === 'events') {
        if (state.subTab && state.subTab !== 'my-events') {
          sp.set('subTab', state.subTab);
        }
        if (state.subTab === 'detail') {
          if (state.eventId) sp.set('eventId', state.eventId);
          if (state.from) sp.set('from', state.from);
        }
      }

      if (state.tab === 'tracklogs') {
        if (state.view === 'detail') {
          sp.set('view', 'detail');
          if (state.activityId) sp.set('activityId', state.activityId);
        }
      }

      if (state.modal) {
        sp.set('modal', state.modal);
      }

      const qs = sp.toString();
      return qs ? `?${qs}` : window.location.pathname;
    },
    []
  );

  // Parse state from current window.location.search
  const parseCurrentUrl = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const sp = new URLSearchParams(window.location.search);

    const rawTab = sp.get('tab');
    let tab: NavTab = 'dashboard';
    if (rawTab === 'tournaments' || rawTab === 'events') tab = 'tournaments';
    else if (
      rawTab === 'tracklogs' ||
      rawTab === 'trophy' ||
      rawTab === 'clubs' ||
      rawTab === 'account' ||
      rawTab === 'admin'
    ) {
      tab = rawTab as NavTab;
    }

    const rawSubTab = sp.get('subTab');
    let subTab: TournamentSubTab = 'my-events';
    if (rawSubTab === 'explore' || rawSubTab === 'detail') {
      subTab = rawSubTab;
    }

    const eventId = sp.get('eventId') || defaultEventId;
    const rawFrom = sp.get('from');
    const from: 'my-events' | 'explore' | 'dashboard' =
      rawFrom === 'my-events' || rawFrom === 'dashboard' ? rawFrom : 'explore';

    const rawView = sp.get('view');
    const view: TracklogViewMode = rawView === 'detail' ? 'detail' : 'list';
    const activityId = sp.get('activityId') || defaultActivityId;

    const rawModal = sp.get('modal') as AppModal | null;
    const validModals: AppModal[] = [
      'ebib',
      'register',
      'participant',
      'create-event',
      'share',
      'simulator',
    ];
    const modal: AppModal | null =
      rawModal && validModals.includes(rawModal) ? rawModal : null;

    return {
      tab,
      subTab,
      eventId,
      from,
      view,
      activityId,
      modal,
    };
  }, [defaultActivityId, defaultEventId]);

  // Initial URL hydration on mount
  useEffect(() => {
    if (!isInitialMount.current) return;
    isInitialMount.current = false;

    const parsed = parseCurrentUrl();
    if (parsed) {
      setActiveTabState(parsed.tab);
      setRunnerEventSubTabState(parsed.subTab);
      if (parsed.eventId) setSelectedEventIdState(parsed.eventId);
      setTournamentFromState(parsed.from);
      setTracklogViewModeState(parsed.view);
      if (parsed.activityId) setSelectedActivityIdState(parsed.activityId);
      if (parsed.modal) setActiveModalState(parsed.modal);

      // If URL had no query params, keep clean without forcing
      // Store current state in history.replaceState
      window.history.replaceState(
        {
          tab: parsed.tab,
          subTab: parsed.subTab,
          eventId: parsed.eventId,
          from: parsed.from,
          view: parsed.view,
          activityId: parsed.activityId,
          modal: parsed.modal,
        },
        '',
        window.location.search || window.location.pathname
      );
    }
  }, [parseCurrentUrl]);

  // Listen to popstate (Browser Back / Forward buttons & mobile swipe back)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const parsed = parseCurrentUrl();
      if (!parsed) return;

      setActiveTabState(parsed.tab);
      setRunnerEventSubTabState(parsed.subTab);
      if (parsed.eventId) setSelectedEventIdState(parsed.eventId);
      setTournamentFromState(parsed.from);
      setTracklogViewModeState(parsed.view);
      if (parsed.activityId) setSelectedActivityIdState(parsed.activityId);
      setActiveModalState(parsed.modal);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [parseCurrentUrl]);

  // Navigate to Top-Level Tab
  const navigateToTab = useCallback(
    (newTab: NavTab, replace = false) => {
      const targetTab = newTab === 'events' ? 'tournaments' : newTab;
      setActiveTabState(targetTab);
      setActiveModalState(null);

      // Keep subtab if navigating to tournaments, or default to my-events
      const nextState = {
        tab: targetTab,
        subTab: targetTab === 'tournaments' ? runnerEventSubTab : undefined,
        eventId: targetTab === 'tournaments' ? selectedEventId : undefined,
        from: tournamentFrom,
        view: targetTab === 'tracklogs' ? tracklogViewMode : undefined,
        activityId: targetTab === 'tracklogs' ? selectedActivityId : undefined,
        modal: null,
      };

      const newUrl = buildSearchString(nextState);
      if (replace) {
        window.history.replaceState(nextState, '', newUrl);
      } else {
        window.history.pushState(nextState, '', newUrl);
      }
    },
    [buildSearchString, runnerEventSubTab, selectedActivityId, selectedEventId, tournamentFrom, tracklogViewMode]
  );

  // Tournament SubTabs: 'my-events' | 'explore'
  const navigateToTournamentSubTab = useCallback(
    (subTab: 'my-events' | 'explore') => {
      setActiveTabState('tournaments');
      setRunnerEventSubTabState(subTab);
      setActiveModalState(null);

      const nextState = {
        tab: 'tournaments' as NavTab,
        subTab,
        eventId: selectedEventId,
        from: subTab,
        modal: null,
      };
      const newUrl = buildSearchString(nextState);
      window.history.pushState(nextState, '', newUrl);
    },
    [buildSearchString, selectedEventId]
  );

  // Tournament Detail View
  const navigateToTournamentDetail = useCallback(
    (
      eventId: string,
      fromOrigin: 'my-events' | 'explore' | 'dashboard' = 'explore'
    ) => {
      setActiveTabState('tournaments');
      setRunnerEventSubTabState('detail');
      setSelectedEventIdState(eventId);
      setTournamentFromState(fromOrigin);
      setActiveModalState(null);

      const nextState = {
        tab: 'tournaments' as NavTab,
        subTab: 'detail' as TournamentSubTab,
        eventId,
        from: fromOrigin,
        modal: null,
      };
      const newUrl = buildSearchString(nextState);
      window.history.pushState(nextState, '', newUrl);
    },
    [buildSearchString]
  );

  // Smart Back from Tournament Detail
  const navigateBackFromTournamentDetail = useCallback(() => {
    // If browser history has an entry, check if we can pop back
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback: navigate smoothly to the origin subtab or explore
      const targetSubTab = tournamentFrom === 'my-events' ? 'my-events' : 'explore';
      if (tournamentFrom === 'dashboard') {
        navigateToTab('dashboard');
      } else {
        navigateToTournamentSubTab(targetSubTab);
      }
    }
  }, [navigateToTab, navigateToTournamentSubTab, tournamentFrom]);

  // Tracklogs Navigation
  const navigateToTracklogs = useCallback(() => {
    setActiveTabState('tracklogs');
    setTracklogViewModeState('list');
    setActiveModalState(null);

    const nextState = {
      tab: 'tracklogs' as NavTab,
      view: 'list' as TracklogViewMode,
      modal: null,
    };
    const newUrl = buildSearchString(nextState);
    window.history.pushState(nextState, '', newUrl);
  }, [buildSearchString]);

  const navigateToTracklogDetail = useCallback(
    (actId: string, fromTab: string = 'tracklogs') => {
      setActiveTabState('tracklogs');
      setTracklogViewModeState('detail');
      setSelectedActivityIdState(actId);
      setActiveModalState(null);

      const nextState = {
        tab: 'tracklogs' as NavTab,
        view: 'detail' as TracklogViewMode,
        activityId: actId,
        modal: null,
      };
      const newUrl = buildSearchString(nextState);
      window.history.pushState(nextState, '', newUrl);
    },
    [buildSearchString]
  );

  const navigateBackFromTracklogDetail = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      navigateToTracklogs();
    }
  }, [navigateToTracklogs]);

  // Modal Safe Management
  const openModal = useCallback(
    (modal: AppModal) => {
      setActiveModalState(modal);

      const nextState = {
        tab: activeTab,
        subTab: runnerEventSubTab,
        eventId: selectedEventId,
        from: tournamentFrom,
        view: tracklogViewMode,
        activityId: selectedActivityId,
        modal,
      };
      const newUrl = buildSearchString(nextState);
      window.history.pushState(nextState, '', newUrl);
    },
    [
      activeTab,
      buildSearchString,
      runnerEventSubTab,
      selectedActivityId,
      selectedEventId,
      tournamentFrom,
      tracklogViewMode,
    ]
  );

  const closeModal = useCallback(
    (modalToClose?: AppModal) => {
      // If modal is currently in history state, pop it back
      const currentState = typeof window !== 'undefined' ? window.history.state : null;
      if (currentState && currentState.modal) {
        window.history.back();
      } else {
        // Direct close & clean URL without extra history item
        setActiveModalState(null);
        const nextState = {
          tab: activeTab,
          subTab: runnerEventSubTab,
          eventId: selectedEventId,
          from: tournamentFrom,
          view: tracklogViewMode,
          activityId: selectedActivityId,
          modal: null,
        };
        const newUrl = buildSearchString(nextState);
        window.history.replaceState(nextState, '', newUrl);
      }
    },
    [
      activeTab,
      buildSearchString,
      runnerEventSubTab,
      selectedActivityId,
      selectedEventId,
      tournamentFrom,
      tracklogViewMode,
    ]
  );

  return {
    activeTab,
    setActiveTab: navigateToTab,
    runnerEventSubTab,
    setRunnerEventSubTab: navigateToTournamentSubTab,
    selectedEventId,
    setSelectedEventId: (id: string) => {
      setSelectedEventIdState(id);
      if (runnerEventSubTab === 'detail') {
        const nextState = {
          tab: 'tournaments' as NavTab,
          subTab: 'detail' as TournamentSubTab,
          eventId: id,
          from: tournamentFrom,
          modal: activeModal,
        };
        window.history.replaceState(nextState, '', buildSearchString(nextState));
      }
    },
    tournamentFrom,
    navigateToTournamentDetail,
    navigateBackFromTournamentDetail,
    tracklogViewMode,
    setTracklogViewMode: setTracklogViewModeState,
    selectedActivityId,
    setSelectedActivityId: setSelectedActivityIdState,
    navigateToTracklogs,
    navigateToTracklogDetail,
    navigateBackFromTracklogDetail,
    activeModal,
    openModal,
    closeModal,
  };
}

