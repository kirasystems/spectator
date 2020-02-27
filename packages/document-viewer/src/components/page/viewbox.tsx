import React from "react";
import Flatbush from "flatbush";

import { topicToColor } from "../ui/annotationcolors/index";

import {
  BoundingBox,
  IndexedAnnotation,
  MousePosition,
  MouseSelection,
  PageSelection,
  Selection,
  Token
} from "../../types";

import "./style.css";

const RECTANGLE_PADDING = 6; // px

type Rectangle = BoundingBox & {
  annotationTopic: string;
  annotationIndex: number;
};

// Returns closest
// var arr = [{characterStart: 1, characterEnd: 5},
//   {characterStart: 5, characterEnd: 10},
//   {characterStart: 10, characterEnd: 15},
//   {characterStart: 15, characterEnd: 20}];

// [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 100].forEach((n: number) =>
// console.log(characterStartToTokenIndex(arr, n))
// );
function characterStartToTokenIndex(characterStart: number, tokens: Token[]) {
  let mid,
    left = 0,
    right = tokens.length - 1;

  while (left <= right) {
    mid = Math.floor((left + right) / 2);

    if (characterStart < tokens[mid].characterStart) {
      right = mid - 1;
    } else if (characterStart >= tokens[mid].characterEnd) {
      // exclusive end
      left = mid + 1;
    } else {
      return mid;
    }
  }
  return left < tokens.length - 1 ? left : tokens.length - 1;
}

// Returns closest
// var arr = [{characterStart: 1, characterEnd: 5},
//   {characterStart: 5, characterEnd: 10},
//   {characterStart: 10, characterEnd: 15},
//   {characterStart: 15, characterEnd: 20}];

// [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 100].forEach((n: number) =>
// console.log(characterEndToTokenIndex(arr, n))
// );
function characterEndToTokenIndex(characterEnd: number, tokens: Token[]) {
  let mid,
    left = 0,
    right = tokens.length - 1;

  while (left <= right) {
    mid = Math.floor((left + right) / 2);

    if (characterEnd <= tokens[mid].characterStart) {
      // exclusive end
      right = mid - 1;
    } else if (characterEnd > tokens[mid].characterEnd) {
      // exclusive end
      left = mid + 1;
    } else {
      return mid;
    }
  }
  return right < 0 ? 0 : right;
}

function annotationToTokens(annotation: IndexedAnnotation, tokens: Token[]) {
  let startIndex =
    annotation.characterStart === Number.NEGATIVE_INFINITY
      ? 0
      : characterStartToTokenIndex(annotation.characterStart, tokens);
  let endIndex =
    annotation.characterEnd === Number.POSITIVE_INFINITY
      ? tokens.length - 1
      : characterEndToTokenIndex(annotation.characterEnd, tokens);
  return tokens.slice(startIndex, endIndex + 1);
}

function tokensToRectangles(tokens: Token[]) {
  let lines = tokens.reduce((linesMap, token) => {
    let lineTokens = linesMap.get(token.line) ?? [];
    lineTokens.push(token);
    linesMap.set(token.line, lineTokens);
    return linesMap;
  }, new Map<number, Token[]>());

  let rectangles = [];

  for (const lineTokens of Array.from(lines.values())) {
    let rectangle = lineTokens
      .map((token: Token) => {
        return { ...token.boundingBox };
      })
      .reduce((boundingBox: BoundingBox, tokenBoundingBox: BoundingBox) => {
        boundingBox.top = Math.min(boundingBox.top, tokenBoundingBox.top);
        boundingBox.bottom = Math.max(
          boundingBox.bottom,
          tokenBoundingBox.bottom
        );
        boundingBox.left = Math.min(boundingBox.left, tokenBoundingBox.left);
        boundingBox.right = Math.max(boundingBox.right, tokenBoundingBox.right);
        return boundingBox;
      });

    rectangles.push(rectangle);
  }

  return rectangles;
}

function annotationToRectangles(
  annotation: IndexedAnnotation,
  tokens: Token[]
) {
  let annotationTokens = annotationToTokens(annotation, tokens);

  return tokensToRectangles(annotationTokens);
}

// var tokens = [{characterStart: 1, characterEnd: 5, line: 0, boundingBox: {top: 0, bottom: 10, left: 0, right: 10}},
//   {characterStart: 5, characterEnd: 10, line: 0, boundingBox: {top: 0, bottom: 15, left: 15, right: 25}},
//   {characterStart: 10, characterEnd: 15, line: 1, boundingBox: {top: 15, bottom: 25, left: 0, right: 10}},
//   {characterStart: 15, characterEnd: 20, line: 1, boundingBox: {top: 15, bottom: 25, left: 15, right: 25}}];

// var annotations = [{characterStart: 1, characterEnd: 20}];
// console.log(annotationsToRectangles(annotations, tokens));

function annotationsToRectangles(
  annotations: IndexedAnnotation[],
  tokens: Token[] | null
) {
  if (!tokens) return [];

  return annotations.reduce(
    (rectangles: Rectangle[], annotation: IndexedAnnotation) => {
      let annotationRectangles = annotationToRectangles(annotation, tokens).map(
        (rectangle: BoundingBox) => {
          return {
            ...rectangle,
            annotationTopic: annotation.topic,
            annotationIndex: annotation._index
          };
        }
      );
      return rectangles.concat(annotationRectangles);
    },
    []
  );
}

function selectionToRectangles(
  selection: PageSelection,
  tokens: Token[] | null
) {
  if (!selection || !tokens) return [];

  let startIndex =
    selection.indexStart === Number.NEGATIVE_INFINITY
      ? 0
      : selection.indexStart;
  let endIndex =
    selection.indexEnd === Number.POSITIVE_INFINITY
      ? tokens.length - 1
      : selection.indexEnd;
  let selectedTokens = tokens.slice(startIndex, endIndex + 1);
  return tokensToRectangles(selectedTokens);
}

enum SelectionInPage {
  Start,
  End,
  Both,
  None
}

function selectionInPage(
  mouseSelection: MouseSelection,
  pageImageWrapperEl: HTMLDivElement
): SelectionInPage {
  let containerEl = pageImageWrapperEl.closest(".Pages");

  if (!containerEl || !mouseSelection) return SelectionInPage.None;

  let containerBCR = containerEl.getBoundingClientRect();
  let imageBCR = pageImageWrapperEl.getBoundingClientRect();

  let top = containerEl.scrollTop + (imageBCR.top - containerBCR.top);
  let bottom = top + imageBCR.height;

  let [[, y1], [, y2]] = mouseSelection;

  if (top <= y1 && y1 <= y2 && y2 <= bottom) return SelectionInPage.Both;

  if (top <= y1 && y1 <= bottom) return SelectionInPage.Start;

  if (top <= y2 && y2 <= bottom) return SelectionInPage.End;

  return SelectionInPage.None;
}

function scaleMousePosition(
  mousePosition: MousePosition,
  originalPageHeight: number,
  originalPageWidth: number,
  pageImageWrapperEl: HTMLDivElement
) {
  let containerEl = pageImageWrapperEl.closest(".Pages");
  
  if (!mousePosition || !containerEl) return [0, 0];

  let containerBCR = containerEl.getBoundingClientRect();
  let pageBCR = pageImageWrapperEl.getBoundingClientRect();

  let x = mousePosition[0];
  let y = mousePosition[1];

  let scaledX =
    (x - (pageBCR.left - containerBCR.left + containerEl.scrollLeft)) *
    (originalPageWidth / pageBCR.width);
  let scaledY =
    (y - (pageBCR.top - containerBCR.top + containerEl.scrollTop)) *
    (originalPageHeight / pageBCR.height);

  return [scaledX, scaledY];
}

type ViewboxrProps = {
  annotations: IndexedAnnotation[];
  focusedAnnotationIndex: number;
  focusingAnnotation: boolean;
  imageURL: string;
  onAnnotationFocus: (annotationIndex: number) => void;
  onSelectionStart: (selection: Selection) => void;
  onSelectionEnd: (selection: Selection) => void;
  originalPageHeight: number;
  originalPageWidth: number;
  pageNumber: number;
  mouseSelection: MouseSelection;
  selection: PageSelection;
  tokensURL: string;
};

const Viewbox = (props: ViewboxrProps) => {
  const {
    annotations,
    focusedAnnotationIndex,
    focusingAnnotation,
    imageURL,
    onAnnotationFocus,
    onSelectionStart,
    onSelectionEnd,
    originalPageHeight,
    originalPageWidth,
    pageNumber,
    mouseSelection,
    selection,
    tokensURL,
  } = props;

  const pageImageWrapperRef = React.useRef<HTMLDivElement>(null);

  const [tokens, setTokens] = React.useState<Token[] | null>(null);
  const [rtree, setRtree] = React.useState<Flatbush | null>(null);

  const annotationRectangles = React.useMemo(
    () => annotationsToRectangles(annotations, tokens),
    [annotations, tokens]
  );

  const selectionRectangles = React.useMemo(
    () => selectionToRectangles(selection, tokens),
    [selection, tokens]
  );

  const abortController = React.useMemo(() => {
    return new AbortController();
  }, []);
  
  React.useEffect(() => {
    async function fetchTokens() {
      // The tokens are meant to be immutable, so let's always
      // use the cache if it's there
      try {
        const res = await fetch(tokensURL, {cache: "force-cache", signal: abortController.signal});
        res
          .json()
          .then(res => setTokens(res))
          .catch(err => console.error('Error fetching the tokens', err));
      }
      catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching the tokens', err);
        }
      }
    }

    if (tokens) return;

    fetchTokens();

    return () => abortController.abort();
  }, [abortController, tokens, tokensURL]);

  React.useEffect(() => {
    if (!tokens) return;

    const index = new Flatbush(tokens.length);

    for (const token of tokens) {
      let boundingBox = token.boundingBox;
      index.add(
        boundingBox.left,
        boundingBox.top,
        boundingBox.right,
        boundingBox.bottom
      );
    }

    index.finish();
    setRtree(index);
  }, [tokens]);

  React.useEffect(() => {
    if (
      !rtree ||
      !pageImageWrapperRef ||
      !pageImageWrapperRef.current ||
      !mouseSelection ||
      !tokens
    )
      return;

    switch (
      selectionInPage(
        mouseSelection,
        pageImageWrapperRef.current
      )
    ) {
      case SelectionInPage.Start: {
        let [x1, y1] = scaleMousePosition(
          mouseSelection[0],
          originalPageHeight,
          originalPageWidth,
          pageImageWrapperRef.current
        );
        let intersectingIndices = rtree.search(
          x1,
          y1,
          Number.POSITIVE_INFINITY,
          Number.POSITIVE_INFINITY
        );
        let firstIndex = Math.min(...intersectingIndices);
        
        if (Number.isInteger(firstIndex)) {
          onSelectionStart({index: firstIndex, page: pageNumber, token: tokens[firstIndex]});
        }

        break;
      }
      case SelectionInPage.End: {
        let [x2, y2] = scaleMousePosition(
          mouseSelection[1],
          originalPageHeight,
          originalPageWidth,
          pageImageWrapperRef.current
        );
        let intersectingIndices = rtree.search(
          Number.NEGATIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
          x2,
          y2
        );
        let lastIndex = Math.max(...intersectingIndices);

        // If you started selecting on previous pages and it had no tokens, 
        // we'll take the first of this page as the start
        if (!selection && Number.isInteger(lastIndex)) {
          onSelectionStart({index: 0, page: pageNumber, token: tokens[0]});
        }

        onSelectionEnd(Number.isInteger(lastIndex) ? { index: lastIndex, page: pageNumber, token: tokens[lastIndex] } : null);

        break;
      }
      case SelectionInPage.Both:
        let [x1, y1] = scaleMousePosition(
          mouseSelection[0],
          originalPageHeight,
          originalPageWidth,
          pageImageWrapperRef.current
        );
        let [x2, y2] = scaleMousePosition(
          mouseSelection[1],
          originalPageHeight,
          originalPageWidth,
          pageImageWrapperRef.current
        );
        
        let intersectingIndices = rtree.search(x1, y1, x2, y2);
        let firstIndex = Math.min(...intersectingIndices);
        let lastIndex = Math.max(...intersectingIndices);
        
        onSelectionStart(Number.isInteger(firstIndex) ? { index: firstIndex, page: pageNumber, token: tokens[firstIndex] } : null);
        onSelectionEnd(Number.isInteger(lastIndex) ? { index: lastIndex, page: pageNumber, token: tokens[lastIndex] } : null);
        break;
    }
  }, [
    mouseSelection,
    onSelectionStart,
    onSelectionEnd,
    originalPageHeight,
    originalPageWidth,
    pageNumber,
    pageImageWrapperRef,
    rtree,
    selection,
    tokens
  ]);

  return (
    <div className={"Page__Image-Wrapper"} ref={pageImageWrapperRef}>
          {imageURL && (
            <img
              className={"Page__Image"}
              src={imageURL}
              alt={"Image of page " + pageNumber}
            />
          )}

          {tokens && (
            <svg
              className={"Page__Image-Viewbox"}
              viewBox={"0 0 " + originalPageWidth + " " + originalPageHeight}>
              {annotationRectangles.map(
                (rectangle: Rectangle, index: number) => (
                  <rect
                    key={index}
                    className={`Annotation-Rectangle${
                      focusingAnnotation &&
                      rectangle.annotationIndex === focusedAnnotationIndex
                        ? " Annotation-Rectangle--focused"
                        : ""
                    }`}
                    x={rectangle.left - RECTANGLE_PADDING}
                    y={rectangle.top - RECTANGLE_PADDING}
                    onClick={(event: React.MouseEvent) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onAnnotationFocus(rectangle.annotationIndex);
                    }}
                    width={ rectangle.right - rectangle.left + 2 * RECTANGLE_PADDING }
                    height={ rectangle.bottom - rectangle.top + 2 * RECTANGLE_PADDING }
                    style={{ fill: topicToColor(rectangle.annotationTopic) }}
                  />
                )
              )}

              {selectionRectangles.map(
                (rectangle: BoundingBox, index: number) => (
                  <rect
                    key={index}
                    className="Selection-Rectangle"
                    x={rectangle.left - RECTANGLE_PADDING}
                    y={rectangle.top - RECTANGLE_PADDING}
                    width={
                      rectangle.right - rectangle.left + 2 * RECTANGLE_PADDING
                    }
                    height={
                      rectangle.bottom - rectangle.top + 2 * RECTANGLE_PADDING
                    }
                  />
                )
              )}
            </svg>
          )}
        </div>
  );
};

export default Viewbox;