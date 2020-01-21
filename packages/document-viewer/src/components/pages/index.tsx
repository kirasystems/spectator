import React from "react";

import isEqual from "lodash.isequal";

import { NavigationModes } from "../../enums";

import {
  Annotation,
  IndexedAnnotation,
  MousePosition,
  MouseSelection,
  Page as PageType,
  PageSelection,
  Selection,
  ScrollPosition
} from "../../types";

import Topics from "../topics/index";
import Page from "../page/index";

import smoothScroll from "../ui/smoothscroll/index";

import "./style.css";

function annotationsPerPage(
  annotations: IndexedAnnotation[],
  numberOfPages: number
): Map<number, IndexedAnnotation[]> {
  let pages = new Map();

  for (let i = 1; i <= numberOfPages; i++) {
    pages.set(i, []);
  }

  annotations.forEach(annotation => {
    for (let i = annotation.pageStart; i <= annotation.pageEnd; i++) {
      let pageAnnotation = { ...annotation };

      if (i === annotation.pageStart && i !== annotation.pageEnd) {
        pageAnnotation.characterEnd = Number.POSITIVE_INFINITY;
      } else if (i === annotation.pageEnd && i !== annotation.pageStart) {
        pageAnnotation.characterStart = Number.NEGATIVE_INFINITY;
      } else if (i > annotation.pageStart && i < annotation.pageEnd) {
        pageAnnotation.characterStart = Number.NEGATIVE_INFINITY;
        pageAnnotation.characterEnd = Number.POSITIVE_INFINITY;
      }

      pages.get(i).push(pageAnnotation);
    }
  });

  return pages;
}

function selectionPerPage(
  selectionStart: Selection,
  selectionEnd: Selection,
  numberOfPages: number
): Map<number, PageSelection> {
  let pages = new Map();

  if (!selectionStart || !selectionEnd) return pages;

  let selection = {
    indexStart: selectionStart.index,
    indexEnd: selectionEnd.index,
    pageStart: selectionStart.page,
    pageEnd: selectionEnd.page
  };

  for (let i = selection.pageStart; i <= selection.pageEnd; i++) {
    let pageSelection = {
      indexStart: selection.indexStart,
      indexEnd: selection.indexEnd
    };

    if (i === selection.pageStart && i !== selection.pageEnd) {
      pageSelection.indexEnd = Number.POSITIVE_INFINITY;
    } else if (i === selection.pageEnd && i !== selection.pageStart) {
      pageSelection.indexStart = Number.NEGATIVE_INFINITY;
    } else if (i > selection.pageStart && i < selection.pageEnd) {
      pageSelection.indexStart = Number.NEGATIVE_INFINITY;
      pageSelection.indexEnd = Number.POSITIVE_INFINITY;
    }

    pages.set(i, pageSelection);
  }

  return pages;
}

function pageInView(container: HTMLElement): number {
  let pageNumber = 0;
  let children = container.children;

  let containerBCR = container.getBoundingClientRect();
  let containerMiddle = containerBCR.top + containerBCR.height / 2;

  let pageBCR;

  do {
    pageBCR = children[pageNumber].getBoundingClientRect();
    pageNumber++;
  } while (pageBCR.bottom < containerMiddle);

  return pageNumber;
}

type PagesProps = {
  annotations: IndexedAnnotation[];
  currentPage: number;
  focusedAnnotationIndex: number;
  focusingAnnotation: boolean;
  lazyLoadingWindow: number;
  navigationMode: NavigationModes;
  onAnnotationCreate: (annotation: Annotation) => void;
  onAnnotationDelete: (annotation: IndexedAnnotation) => void;
  onFocusedAnnotationIndexChange: (annotationIndex: number) => void;
  onFocusingAnnotationChange: (focusing: boolean) => void;
  onPageChange: (pageNumber: number) => void;
  pages: PageType[];
  topics: string[];
  zoom: number;
};

export interface PagesHandle {
  scrollToPage(pageNumber: number): void;
  scrollToAnnotation(annotationIndex: number): void;
}

const Pages: React.RefForwardingComponent<PagesHandle, PagesProps> = (
  props,
  ref
) => {
  const {
    annotations,
    currentPage,
    focusedAnnotationIndex,
    focusingAnnotation,
    lazyLoadingWindow,
    navigationMode,
    onAnnotationCreate,
    onAnnotationDelete,
    onFocusedAnnotationIndexChange,
    onFocusingAnnotationChange,
    onPageChange,
    pages,
    topics,
    zoom
  } = props;

  const [mouseStart, setMouseStart] = React.useState<MousePosition>(null);
  const [mouseEnd, setMouseEnd] = React.useState<MousePosition>(null);

  const [selecting, setSelecting] = React.useState(false);
  const [selectionStart, setSelectionStart] = React.useState<Selection>(null);
  const [selectionEnd, setSelectionEnd] = React.useState<Selection>(null);

  const [scrolling, setScrolling] = React.useState(false);
  const [scrollPosition, setScrollPosition] = React.useState<ScrollPosition>([0, 0]);

  const pagesEl = React.useRef<HTMLOListElement>(null);

  const pageAnnotations = React.useMemo(
    () => annotationsPerPage(annotations, pages.length),
    [annotations, pages.length]
  );

  const pageSelection = React.useMemo(
    () => selectionPerPage(selectionStart, selectionEnd, pages.length),
    [selectionStart, selectionEnd, pages.length]
  );

  const mouseSelection = React.useMemo((): MouseSelection => {
    if (mouseStart && mouseEnd) {
      return mouseStart[1] < mouseEnd[1]
        ? [mouseStart, mouseEnd]
        : [mouseEnd, mouseStart];
    } else {
      return null;
    }
  }, [mouseStart, mouseEnd]);

  const mousePosition = (
    event: MouseEvent | React.MouseEvent
  ): MousePosition => {
    if (pagesEl && pagesEl.current) {
      let pagesBCR = pagesEl.current.getBoundingClientRect();

      return [
        event.clientX - pagesBCR.left + pagesEl.current.scrollLeft,
        event.clientY - pagesBCR.top + pagesEl.current.scrollTop
      ];
    }

    return null;
  };

  const handleMouseMove = React.useCallback(
    (event: MouseEvent) => {
      let newMouseEnd = mousePosition(event);
      
      if (!isEqual(mouseEnd, newMouseEnd)) {
        setMouseEnd(newMouseEnd);
      }
    },
    [mouseEnd, setMouseEnd]
  );

  const handleMouseUp = React.useCallback(() => {
    setSelecting(false);
    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  const handleMouseDown = React.useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0) {
        // clicked something else than the main button
        return;
      }
      
      // Return if the user selected a topic
      let targetElement = event.target as Element;
      if (targetElement.matches(".Topics, .Topics *")) {
        return;
      }

      let position = mousePosition(event);

      // If a user holds shift + click somewhere,
      // adjust the mouseEnd
      if (event.shiftKey && mouseStart) {
        setMouseEnd(position);
        return;
      }      

      // Reset selection
      setSelectionStart(null);
      setSelectionEnd(null);
      setMouseStart(position);
      setMouseEnd(null);
      setSelecting(true);

      // Only listen to mouseup and mousemove when the mouse button is pressed
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("mousemove", handleMouseMove);
    },
    [handleMouseMove, handleMouseUp, mouseStart]
  );

  const handleClick = React.useCallback(
    (event: React.MouseEvent) => {
      if (navigationMode === NavigationModes.Annotation) return;

      onFocusingAnnotationChange(false);
    },
    [navigationMode, onFocusingAnnotationChange]
  );

  const handleSelectionStart = React.useCallback(
    (selection: Selection) => {
      if (!isEqual(selection, selectionStart)) {
        setSelectionStart(selection);
      }
    },
    [setSelectionStart, selectionStart]
  );

  const handleSelectionEnd = React.useCallback(
    (selection: Selection) => {
      if (!isEqual(selection, selectionEnd)) {
        setSelectionEnd(selection);
      }
    },
    [setSelectionEnd, selectionEnd]
  );

  const handleScroll = React.useCallback((event: React.UIEvent<HTMLOListElement>) => {
    if (!pagesEl || !pagesEl.current) return;

    onPageChange(pageInView(pagesEl.current));

    let newScrollLeft = pagesEl.current.scrollLeft;
    let newScrollTop  = pagesEl.current.scrollTop;

    // If user is selecting and scrolling, it won't send a new MouseMove event
    // so we need to adjust the MousePosition based on the delta of the scroll
    if (selecting && mouseStart) {
      let [mouseX, mouseY] = mouseEnd || mouseStart;
      let [scrollLeft, scrollTop] = scrollPosition;

      setMouseEnd([mouseX + (newScrollLeft - scrollLeft),
                   mouseY + (newScrollTop - scrollTop)]);      
    }

    setScrollPosition([newScrollLeft, newScrollTop]);
    
  }, [mouseEnd, mouseStart, onPageChange, scrollPosition, selecting, setMouseEnd, setScrollPosition]);

  const handleAnnotation = React.useCallback(
    (topic: string) => {
      if (!selectionStart || !selectionEnd) return;

      onAnnotationCreate({
        characterStart: selectionStart.token.characterStart,
        characterEnd: selectionEnd.token.characterEnd,
        pageStart: selectionStart.page,
        pageEnd: selectionEnd.page,
        top: selectionStart.token.boundingBox.top,
        left: selectionStart.token.boundingBox.left,
        topic: topic
      });

      // Clear mouse and selection
      setMouseStart(null);
      setMouseEnd(null);
      setSelectionStart(null);
      setSelectionEnd(null);
    },
    [onAnnotationCreate, selectionStart, selectionEnd]
  );

  React.useImperativeHandle(ref, () => ({
    scrollToPage(pageNumber: number) {
      if (!pagesEl.current) return;

      const pageEl = pagesEl.current.children[pageNumber - 1];
      const pagesBCR = pagesEl.current.getBoundingClientRect();
      const pageBCR = pageEl.getBoundingClientRect();

      setScrolling(true);
      smoothScroll(pagesEl.current, 
        { endY: pageBCR.top - pagesBCR.top + pagesEl.current.scrollTop}, 
        200, 
        () => setScrolling(false)
      );
    },

    scrollToAnnotation(annotationIndex: number) {
      if (!pagesEl.current) return;

      const annotation = annotations[annotationIndex - 1];
      const page = pages[annotation.pageStart - 1];

      const pageEl = pagesEl.current.children[annotation.pageStart - 1];
      const pagesBCR = pagesEl.current.getBoundingClientRect();
      const pageBCR = pageEl.getBoundingClientRect();

      const pageX = pageBCR.left - pagesBCR.left + pagesEl.current.scrollLeft;
      const pageY = pageBCR.top - pagesBCR.top + pagesEl.current.scrollTop;

      const annotationX =
        annotation.left * (pageBCR.width / page.originalWidth);
      const annotationY =
        annotation.top * (pageBCR.height / page.originalHeight);

      setScrolling(true);
      smoothScroll(pagesEl.current, 
        {endX: pageX + annotationX - 20,
         endY: pageY + annotationY - 20},
        200,
        () => setScrolling(false)
      );
    }
  }));

  return (
    <ol
      ref={pagesEl}
      className={"Pages"}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onScroll={handleScroll}
    >
      {pages.map(
        (page: PageType, index: number) => (
            <Page
              key={index}
              annotations={pageAnnotations.get(index + 1) ?? []}
              focusedAnnotationIndex={focusedAnnotationIndex}
              focusingAnnotation={focusingAnnotation}
              imageURL={page.imageURL}
              load={!scrolling && (index + 1) >= (currentPage - lazyLoadingWindow) && (index + 1) <= (currentPage + lazyLoadingWindow)}
              onAnnotationDelete={onAnnotationDelete}
              onFocusedAnnotationIndexChange={onFocusedAnnotationIndexChange}
              onFocusingAnnotationChange={onFocusingAnnotationChange}
              onSelectionStart={handleSelectionStart}
              onSelectionEnd={handleSelectionEnd}
              originalPageHeight={page.originalHeight}
              originalPageWidth={page.originalWidth}
              pageNumber={index + 1}
              mouseSelection={mouseSelection}
              selection={pageSelection.get(index + 1) || null}
              tokensURL={page.tokensURL}
              zoom={zoom}/>)
      )}
      {selectionStart && selectionEnd && (
        <Topics topics={topics} onAnnotation={handleAnnotation} />
      )}
    </ol>
  );
};

export default React.forwardRef(Pages);
