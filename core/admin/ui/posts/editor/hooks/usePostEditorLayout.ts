import { useCallback, useMemo, useReducer } from "react";

export type PostEditorSecondarySidebar = "list-view" | "inserter" | null;
export type PostEditorDetailsTab = "document" | "block";
export type PostEditorLeftRailMode = "blocks" | "outline" | "list-view";
export type PostEditorLayoutFocusRestore = {
  secondarySidebar: PostEditorSecondarySidebar;
  detailsOpen: boolean;
};

export type PostEditorLayoutState = {
  secondarySidebar: PostEditorSecondarySidebar;
  detailsOpen: boolean;
  detailsTab: PostEditorDetailsTab;
  focusMode: boolean;
  leftRailMode: PostEditorLeftRailMode;
  focusRestore: PostEditorLayoutFocusRestore | null;
};

type CreatePostEditorLayoutStateOptions = {
  initialSecondarySidebar?: PostEditorSecondarySidebar;
  initialDetailsOpen?: boolean;
  initialDetailsTab?: PostEditorDetailsTab;
  initialFocusMode?: boolean;
  initialLeftRailMode?: PostEditorLeftRailMode;
};

const normalizeSecondarySidebar = (
  value: PostEditorSecondarySidebar | undefined
): PostEditorSecondarySidebar => (value === "list-view" || value === "inserter" ? value : null);

const normalizeDetailsTab = (value: PostEditorDetailsTab | undefined): PostEditorDetailsTab =>
  value === "block" ? "block" : "document";

const normalizeLeftRailMode = (
  value: PostEditorLeftRailMode | undefined
): PostEditorLeftRailMode => (value === "outline" || value === "list-view" ? value : "blocks");

export const createPostEditorLayoutState = (
  options: CreatePostEditorLayoutStateOptions = {}
): PostEditorLayoutState => {
  const secondarySidebar = normalizeSecondarySidebar(options.initialSecondarySidebar);
  const detailsOpen = options.initialDetailsOpen === true;
  const focusMode = options.initialFocusMode === true;

  return {
    secondarySidebar: focusMode ? null : secondarySidebar,
    detailsOpen: focusMode ? false : detailsOpen,
    detailsTab: normalizeDetailsTab(options.initialDetailsTab),
    focusMode,
    leftRailMode: normalizeLeftRailMode(options.initialLeftRailMode),
    focusRestore: focusMode
      ? {
          secondarySidebar,
          detailsOpen,
        }
      : null,
  };
};

export type PostEditorLayoutAction =
  | { type: "open_secondary"; sidebar: Exclude<PostEditorSecondarySidebar, null> }
  | { type: "toggle_secondary"; sidebar: Exclude<PostEditorSecondarySidebar, null> }
  | { type: "close_secondary" }
  | { type: "open_details"; tab?: PostEditorDetailsTab }
  | { type: "toggle_details"; tab?: PostEditorDetailsTab }
  | { type: "close_details" }
  | { type: "set_details_tab"; tab: PostEditorDetailsTab }
  | { type: "set_left_rail_mode"; mode: PostEditorLeftRailMode }
  | { type: "set_focus_mode"; value: boolean }
  | { type: "toggle_focus_mode" };

export const postEditorLayoutReducer = (
  state: PostEditorLayoutState,
  action: PostEditorLayoutAction
): PostEditorLayoutState => {
  switch (action.type) {
    case "open_secondary":
      return {
        ...state,
        secondarySidebar: action.sidebar,
        focusMode: false,
        focusRestore: null,
      };
    case "toggle_secondary":
      return {
        ...state,
        secondarySidebar: state.secondarySidebar === action.sidebar ? null : action.sidebar,
        focusMode: state.secondarySidebar === action.sidebar ? state.focusMode : false,
        focusRestore: null,
      };
    case "close_secondary":
      return {
        ...state,
        secondarySidebar: null,
      };
    case "open_details":
      return {
        ...state,
        detailsOpen: true,
        detailsTab: normalizeDetailsTab(action.tab ?? state.detailsTab),
        focusMode: false,
        focusRestore: null,
      };
    case "toggle_details": {
      const nextTab = normalizeDetailsTab(action.tab ?? state.detailsTab);
      if (state.detailsOpen && state.detailsTab === nextTab) {
        return {
          ...state,
          detailsOpen: false,
          focusRestore: null,
        };
      }
      return {
        ...state,
        detailsOpen: true,
        detailsTab: nextTab,
        focusMode: false,
        focusRestore: null,
      };
    }
    case "close_details":
      return {
        ...state,
        detailsOpen: false,
      };
    case "set_details_tab":
      return {
        ...state,
        detailsTab: normalizeDetailsTab(action.tab),
      };
    case "set_left_rail_mode":
      return {
        ...state,
        leftRailMode: normalizeLeftRailMode(action.mode),
      };
    case "set_focus_mode":
      if (action.value) {
        if (state.focusMode) return state;
        return {
          ...state,
          focusMode: true,
          secondarySidebar: null,
          detailsOpen: false,
          focusRestore: {
            secondarySidebar: state.secondarySidebar,
            detailsOpen: state.detailsOpen,
          },
        };
      }
      if (!state.focusMode) {
        return {
          ...state,
          focusRestore: null,
        };
      }
      return {
        ...state,
        focusMode: false,
        secondarySidebar: state.focusRestore?.secondarySidebar ?? state.secondarySidebar,
        detailsOpen: state.focusRestore?.detailsOpen ?? state.detailsOpen,
        focusRestore: null,
      };
    case "toggle_focus_mode":
      if (state.focusMode) {
        return {
          ...state,
          focusMode: false,
          secondarySidebar: state.focusRestore?.secondarySidebar ?? state.secondarySidebar,
          detailsOpen: state.focusRestore?.detailsOpen ?? state.detailsOpen,
          focusRestore: null,
        };
      }
      return {
        ...state,
        focusMode: true,
        secondarySidebar: null,
        detailsOpen: false,
        focusRestore: {
          secondarySidebar: state.secondarySidebar,
          detailsOpen: state.detailsOpen,
        },
      };
    default:
      return state;
  }
};

type UsePostEditorLayoutOptions = CreatePostEditorLayoutStateOptions;

export type UsePostEditorLayoutResult = {
  state: PostEditorLayoutState;
  secondarySidebarOpen: boolean;
  detailsSidebarOpen: boolean;
  showListView: boolean;
  showInserter: boolean;
  focusMode: boolean;
  leftRailMode: PostEditorLeftRailMode;
  openListView: () => void;
  toggleListView: () => void;
  openInserter: () => void;
  toggleInserter: () => void;
  closeSecondarySidebar: () => void;
  openDetails: (tab?: PostEditorDetailsTab) => void;
  toggleDetails: (tab?: PostEditorDetailsTab) => void;
  openDetailsForSelection: (hasSelectedBlock: boolean) => void;
  closeDetails: () => void;
  setDetailsTab: (tab: PostEditorDetailsTab) => void;
  setLeftRailMode: (mode: PostEditorLeftRailMode) => void;
  setFocusMode: (value: boolean) => void;
  toggleFocusMode: () => void;
};

export function usePostEditorLayout(
  options: UsePostEditorLayoutOptions = {}
): UsePostEditorLayoutResult {
  const [state, dispatch] = useReducer(
    postEditorLayoutReducer,
    options,
    createPostEditorLayoutState
  );

  const openListView = useCallback(() => {
    dispatch({ type: "open_secondary", sidebar: "list-view" });
  }, []);

  const toggleListView = useCallback(() => {
    dispatch({ type: "toggle_secondary", sidebar: "list-view" });
    dispatch({ type: "set_left_rail_mode", mode: "list-view" });
  }, []);

  const openInserter = useCallback(() => {
    // The left rail is one always-open panel; opening the Blocks palette means
    // opening the rail (generic "list-view" sentinel) with leftRailMode "blocks".
    dispatch({ type: "open_secondary", sidebar: "list-view" });
    dispatch({ type: "set_left_rail_mode", mode: "blocks" });
  }, []);

  const toggleInserter = useCallback(() => {
    dispatch({ type: "toggle_secondary", sidebar: "inserter" });
    dispatch({ type: "set_left_rail_mode", mode: "blocks" });
  }, []);

  const closeSecondarySidebar = useCallback(() => {
    dispatch({ type: "close_secondary" });
  }, []);

  const openDetails = useCallback((tab?: PostEditorDetailsTab) => {
    dispatch({ type: "open_details", tab });
  }, []);

  const toggleDetails = useCallback((tab?: PostEditorDetailsTab) => {
    dispatch({ type: "toggle_details", tab });
  }, []);

  const openDetailsForSelection = useCallback((hasSelectedBlock: boolean) => {
    dispatch({
      type: "open_details",
      tab: hasSelectedBlock ? "block" : "document",
    });
  }, []);

  const closeDetails = useCallback(() => {
    dispatch({ type: "close_details" });
  }, []);

  const setDetailsTab = useCallback((tab: PostEditorDetailsTab) => {
    dispatch({ type: "set_details_tab", tab });
  }, []);

  const setLeftRailMode = useCallback((mode: PostEditorLeftRailMode) => {
    dispatch({ type: "set_left_rail_mode", mode });
  }, []);

  const setFocusMode = useCallback((value: boolean) => {
    dispatch({ type: "set_focus_mode", value });
  }, []);

  const toggleFocusMode = useCallback(() => {
    dispatch({ type: "toggle_focus_mode" });
  }, []);

  return useMemo(
    () => ({
      state,
      secondarySidebarOpen: state.secondarySidebar !== null,
      detailsSidebarOpen: state.detailsOpen,
      showListView: state.secondarySidebar !== null && state.leftRailMode === "list-view",
      showInserter: state.secondarySidebar !== null && state.leftRailMode === "blocks",
      focusMode: state.focusMode,
      leftRailMode: state.leftRailMode,
      openListView,
      toggleListView,
      openInserter,
      toggleInserter,
      closeSecondarySidebar,
      openDetails,
      toggleDetails,
      openDetailsForSelection,
      closeDetails,
      setDetailsTab,
      setLeftRailMode,
      setFocusMode,
      toggleFocusMode,
    }),
    [
      closeDetails,
      closeSecondarySidebar,
      openDetails,
      openDetailsForSelection,
      openInserter,
      openListView,
      setDetailsTab,
      setLeftRailMode,
      setFocusMode,
      state,
      toggleDetails,
      toggleFocusMode,
      toggleInserter,
      toggleListView,
    ]
  );
}
