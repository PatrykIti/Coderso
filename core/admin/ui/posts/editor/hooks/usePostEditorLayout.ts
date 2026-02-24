import { useCallback, useMemo, useReducer } from "react";

export type PostEditorSecondarySidebar = "list-view" | "inserter" | null;
export type PostEditorDetailsTab = "document" | "block";

export type PostEditorLayoutState = {
  secondarySidebar: PostEditorSecondarySidebar;
  detailsOpen: boolean;
  detailsTab: PostEditorDetailsTab;
  focusMode: boolean;
};

type CreatePostEditorLayoutStateOptions = {
  initialSecondarySidebar?: PostEditorSecondarySidebar;
  initialDetailsOpen?: boolean;
  initialDetailsTab?: PostEditorDetailsTab;
  initialFocusMode?: boolean;
};

const normalizeSecondarySidebar = (
  value: PostEditorSecondarySidebar | undefined
): PostEditorSecondarySidebar =>
  value === "list-view" || value === "inserter" ? value : null;

const normalizeDetailsTab = (
  value: PostEditorDetailsTab | undefined
): PostEditorDetailsTab => (value === "block" ? "block" : "document");

export const createPostEditorLayoutState = (
  options: CreatePostEditorLayoutStateOptions = {}
): PostEditorLayoutState => ({
  secondarySidebar: normalizeSecondarySidebar(options.initialSecondarySidebar),
  detailsOpen: options.initialDetailsOpen === true,
  detailsTab: normalizeDetailsTab(options.initialDetailsTab),
  focusMode: options.initialFocusMode === true,
});

export type PostEditorLayoutAction =
  | { type: "open_secondary"; sidebar: Exclude<PostEditorSecondarySidebar, null> }
  | { type: "toggle_secondary"; sidebar: Exclude<PostEditorSecondarySidebar, null> }
  | { type: "close_secondary" }
  | { type: "open_details"; tab?: PostEditorDetailsTab }
  | { type: "toggle_details"; tab?: PostEditorDetailsTab }
  | { type: "close_details" }
  | { type: "set_details_tab"; tab: PostEditorDetailsTab }
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
      };
    case "toggle_secondary":
      return {
        ...state,
        secondarySidebar:
          state.secondarySidebar === action.sidebar ? null : action.sidebar,
        focusMode:
          state.secondarySidebar === action.sidebar ? state.focusMode : false,
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
      };
    case "toggle_details": {
      const nextTab = normalizeDetailsTab(action.tab ?? state.detailsTab);
      if (state.detailsOpen && state.detailsTab === nextTab) {
        return {
          ...state,
          detailsOpen: false,
        };
      }
      return {
        ...state,
        detailsOpen: true,
        detailsTab: nextTab,
        focusMode: false,
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
    case "set_focus_mode":
      return {
        ...state,
        focusMode: action.value,
        secondarySidebar: action.value ? null : state.secondarySidebar,
        detailsOpen: action.value ? false : state.detailsOpen,
      };
    case "toggle_focus_mode": {
      const nextFocusMode = !state.focusMode;
      return {
        ...state,
        focusMode: nextFocusMode,
        secondarySidebar: nextFocusMode ? null : state.secondarySidebar,
        detailsOpen: nextFocusMode ? false : state.detailsOpen,
      };
    }
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
  }, []);

  const openInserter = useCallback(() => {
    dispatch({ type: "open_secondary", sidebar: "inserter" });
  }, []);

  const toggleInserter = useCallback(() => {
    dispatch({ type: "toggle_secondary", sidebar: "inserter" });
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
      showListView: state.secondarySidebar === "list-view",
      showInserter: state.secondarySidebar === "inserter",
      focusMode: state.focusMode,
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
      setFocusMode,
      state,
      toggleDetails,
      toggleFocusMode,
      toggleInserter,
      toggleListView,
    ]
  );
}
