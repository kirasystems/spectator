import React from "react";
import Flatbush from "flatbush";
import clsx from "clsx";
import isFunction from "lodash.isfunction";
import { Paper } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { topicToColor } from "./ui/annotationColors";

import {
  BoundingBox,
  ImageURL,
  IndexedAnnotation,
  MousePosition,
  MouseSelection,
  PageSelection,
  SearchResult,
  Selection,
  Token,
  TokensURL,
} from "./types";

const RECTANGLE_PADDING = 6; // px

type Rectangle = BoundingBox & {
  annotationTopic: string;
  annotationIndex: number;
};

const useStyles = makeStyles({
  root: {
    position: "relative",
    flex: "1 1 auto",
    cursor: "text",
  },
  image: {
    height: "100%",
    width: "100%",
  },
  svg: {
    position: "absolute",
    top: "0px",
    left: "0px",
    height: "100%",
    width: "100%",
  },
  selection: {
    mixBlendMode: "multiply",
    fillOpacity: 0.6,
  },
  searchResult: {
    fill: "#E9CB77",
    fillOpacity: 0.5,
    mixBlendMode: "multiply",
  },
  rect: {
    cursor: "pointer",
    mixBlendMode: "multiply",
    fillOpacity: 0.3,
  },
  rectFocused: {
    fillOpacity: 0.6,
  },
});

// Returns closest
// var arr = [{characterStart: 1, characterEnd: 5},
//   {characterStart: 5, characterEnd: 10},
//   {characterStart: 10, characterEnd: 15},
//   {characterStart: 15, characterEnd: 20}];

// [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 100].forEach((n: number) =>
// console.log(characterStartToTokenIndex(arr, n))
// );
const characterStartToTokenIndex = (characterStart: number, tokens: Token[]): number => {
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
};

// Returns closest
// var arr = [{characterStart: 1, characterEnd: 5},
//   {characterStart: 5, characterEnd: 10},
//   {characterStart: 10, characterEnd: 15},
//   {characterStart: 15, characterEnd: 20}];

// [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 100].forEach((n: number) =>
// console.log(characterEndToTokenIndex(arr, n))
// );
const characterEndToTokenIndex = (characterEnd: number, tokens: Token[]): number => {
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
};

const annotationToTokens = (annotation: IndexedAnnotation, tokens: Token[]): Token[] => {
  const startIndex =
    annotation.characterStart === Number.NEGATIVE_INFINITY
      ? 0
      : characterStartToTokenIndex(annotation.characterStart, tokens);
  const endIndex =
    annotation.characterEnd === Number.POSITIVE_INFINITY
      ? tokens.length - 1
      : characterEndToTokenIndex(annotation.characterEnd, tokens);
  return tokens.slice(startIndex, endIndex + 1);
};

const tokensToRectangles = (tokens: Token[]): BoundingBox[] => {
  const lines = tokens.reduce((linesMap, token) => {
    const lineTokens = linesMap.get(token.line) ?? [];
    lineTokens.push(token);
    linesMap.set(token.line, lineTokens);
    return linesMap;
  }, new Map<number, Token[]>());

  const rectangles = [];

  for (const lineTokens of Array.from(lines.values())) {
    const rectangle = lineTokens
      .map((token: Token) => {
        return { ...token.boundingBox };
      })
      .reduce((boundingBox: BoundingBox, tokenBoundingBox: BoundingBox) => {
        boundingBox.top = Math.min(boundingBox.top, tokenBoundingBox.top);
        boundingBox.bottom = Math.max(boundingBox.bottom, tokenBoundingBox.bottom);
        boundingBox.left = Math.min(boundingBox.left, tokenBoundingBox.left);
        boundingBox.right = Math.max(boundingBox.right, tokenBoundingBox.right);
        return boundingBox;
      });

    rectangles.push(rectangle);
  }

  return rectangles;
};

const annotationToRectangles = (annotation: IndexedAnnotation, tokens: Token[]): BoundingBox[] => {
  const annotationTokens = annotationToTokens(annotation, tokens);

  return tokensToRectangles(annotationTokens);
};

// var tokens = [{characterStart: 1, characterEnd: 5, line: 0, boundingBox: {top: 0, bottom: 10, left: 0, right: 10}},
//   {characterStart: 5, characterEnd: 10, line: 0, boundingBox: {top: 0, bottom: 15, left: 15, right: 25}},
//   {characterStart: 10, characterEnd: 15, line: 1, boundingBox: {top: 15, bottom: 25, left: 0, right: 10}},
//   {characterStart: 15, characterEnd: 20, line: 1, boundingBox: {top: 15, bottom: 25, left: 15, right: 25}}];

// var annotations = [{characterStart: 1, characterEnd: 20}];
// console.log(annotationsToRectangles(annotations, tokens));

const annotationsToRectangles = (
  annotations: IndexedAnnotation[],
  tokens: Token[] | null
): Rectangle[] => {
  if (!tokens) return [];

  return annotations.reduce((rectangles: Rectangle[], annotation: IndexedAnnotation) => {
    const annotationRectangles = annotationToRectangles(annotation, tokens).map(
      (rectangle: BoundingBox) => {
        return {
          ...rectangle,
          annotationTopic: annotation.topic,
          annotationIndex: annotation._index,
        };
      }
    );
    return rectangles.concat(annotationRectangles);
  }, []);
};

const searchResultsToRectangles = (
  searchResults: SearchResult[],
  tokens: Token[] | null
): BoundingBox[] => {
  if (!tokens) return [];

  return searchResults
    .map(searchResult => {
      const startIndex =
        searchResult.characterStart === Number.NEGATIVE_INFINITY
          ? 0
          : characterStartToTokenIndex(searchResult.characterStart, tokens);
      const endIndex =
        searchResult.characterEnd === Number.POSITIVE_INFINITY
          ? tokens.length - 1
          : characterEndToTokenIndex(searchResult.characterEnd, tokens);
      const searchResultTokens = tokens.slice(startIndex, endIndex + 1);

      return tokensToRectangles(searchResultTokens);
    })
    .flat(1);
};

const selectionToRectangles = (selection: PageSelection, tokens: Token[] | null): BoundingBox[] => {
  if (!selection || !tokens) return [];

  const startIndex = selection.indexStart === Number.NEGATIVE_INFINITY ? 0 : selection.indexStart;
  const endIndex =
    selection.indexEnd === Number.POSITIVE_INFINITY ? tokens.length - 1 : selection.indexEnd;
  const selectedTokens = tokens.slice(startIndex, endIndex + 1);
  return tokensToRectangles(selectedTokens);
};

enum SelectionInPage {
  Start,
  End,
  Both,
  None,
}

const selectionInPage = (
  mouseSelection: MouseSelection,
  pageImageWrapperEl: HTMLDivElement
): SelectionInPage => {
  const containerEl = pageImageWrapperEl.closest(".Pages");

  if (!containerEl || !mouseSelection) return SelectionInPage.None;

  const containerBCR = containerEl.getBoundingClientRect();
  const imageBCR = pageImageWrapperEl.getBoundingClientRect();

  const top = containerEl.scrollTop + (imageBCR.top - containerBCR.top);
  const bottom = top + imageBCR.height;

  const [[, y1], [, y2]] = mouseSelection;

  if (top <= y1 && y1 <= y2 && y2 <= bottom) return SelectionInPage.Both;

  if (top <= y1 && y1 <= bottom) return SelectionInPage.Start;

  if (top <= y2 && y2 <= bottom) return SelectionInPage.End;

  return SelectionInPage.None;
};

const scaleMousePosition = (
  mousePosition: MousePosition,
  originalPageHeight: number,
  originalPageWidth: number,
  pageImageWrapperEl: HTMLDivElement
): MousePosition => {
  const containerEl = pageImageWrapperEl.closest(".Pages");

  if (!mousePosition || !containerEl) return [0, 0];

  const containerBCR = containerEl.getBoundingClientRect();
  const pageBCR = pageImageWrapperEl.getBoundingClientRect();

  const x = mousePosition[0];
  const y = mousePosition[1];

  const scaledX =
    (x - (pageBCR.left - containerBCR.left + containerEl.scrollLeft)) *
    (originalPageWidth / pageBCR.width);
  const scaledY =
    (y - (pageBCR.top - containerBCR.top + containerEl.scrollTop)) *
    (originalPageHeight / pageBCR.height);

  return [scaledX, scaledY];
};

type ViewboxrProps = {
  annotations: IndexedAnnotation[];
  searchResults: SearchResult[];
  focusedAnnotationIndex: number;
  focusingAnnotation: boolean;
  imageURL: ImageURL;
  onAnnotationFocus: (annotationIndex: number) => void;
  onSelectionStart: (selection: Selection) => void;
  onSelectionEnd: (selection: Selection) => void;
  originalPageHeight: number;
  originalPageWidth: number;
  pageNumber: number;
  mouseSelection: MouseSelection;
  selection: PageSelection;
  tokensURL: TokensURL;
};

const Viewbox = (props: ViewboxrProps): JSX.Element => {
  const {
    annotations,
    searchResults,
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

  const classes = useStyles();

  const pageImageWrapperRef = React.useRef<HTMLDivElement>(null);

  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [tokens, setTokens] = React.useState<Token[] | null>(null);
  const [rtree, setRtree] = React.useState<Flatbush | null>(null);

  const annotationRectangles = React.useMemo(() => annotationsToRectangles(annotations, tokens), [
    annotations,
    tokens,
  ]);

  const searchResultRectangles = React.useMemo(
    () => searchResultsToRectangles(searchResults, tokens),
    [searchResults, tokens]
  );

  const selectionRectangles = React.useMemo(() => selectionToRectangles(selection, tokens), [
    selection,
    tokens,
  ]);

  // Create a new AbortController for each new page or else
  // it will be aborted and fetch won't work
  const abortController = React.useMemo(() => {
    return new AbortController();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokensURL]);

  React.useEffect(() => {
    async function fetchTokens(): Promise<void> {
      // The tokens are meant to be immutable, so let's always
      // use the cache if it's there
      try {
        (isFunction(tokensURL)
          ? tokensURL()
          : (
              await fetch(tokensURL, {
                cache: "force-cache",
                signal: abortController.signal,
              })
            ).json()
        )
          .then(res => setTokens(res))
          .catch(err => console.error("Error fetching the tokens", err));
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error fetching the tokens", err);
        }
      }
    }

    fetchTokens();
  }, [abortController, tokensURL]);

  React.useEffect(() => {
    if (!tokens || tokens.length === 0) return;

    const index = new Flatbush(tokens.length);

    for (const token of tokens) {
      const boundingBox = token.boundingBox;
      index.add(boundingBox.left, boundingBox.top, boundingBox.right, boundingBox.bottom);
    }

    index.finish();
    setRtree(index);
  }, [tokens]);

  React.useEffect(() => {
    if (isFunction(imageURL)) {
      imageURL()
        .then(res => setImageSrc(res))
        .catch(err => console.error("Error getting the image url", err));
    } else {
      setImageSrc(imageURL);
    }
  }, [imageURL]);

  React.useEffect(() => {
    if (
      !rtree ||
      !pageImageWrapperRef ||
      !pageImageWrapperRef.current ||
      !mouseSelection ||
      !tokens
    )
      return;

    switch (selectionInPage(mouseSelection, pageImageWrapperRef.current)) {
      case SelectionInPage.Start: {
        const position = scaleMousePosition(
          mouseSelection[0],
          originalPageHeight,
          originalPageWidth,
          pageImageWrapperRef.current
        );

        if (!position) break;

        const [x1, y1] = position;
        const intersectingIndices = rtree.search(
          x1,
          y1,
          Number.POSITIVE_INFINITY,
          Number.POSITIVE_INFINITY
        );
        const firstIndex = Math.min(...intersectingIndices);

        if (Number.isInteger(firstIndex)) {
          onSelectionStart({
            index: firstIndex,
            page: pageNumber,
            token: tokens[firstIndex],
          });
        }

        break;
      }
      case SelectionInPage.End: {
        const position = scaleMousePosition(
          mouseSelection[1],
          originalPageHeight,
          originalPageWidth,
          pageImageWrapperRef.current
        );

        if (!position) break;

        const [x2, y2] = position;
        const intersectingIndices = rtree.search(
          Number.NEGATIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
          x2,
          y2
        );
        const lastIndex = Math.max(...intersectingIndices);

        // If you started selecting on previous pages and it had no tokens,
        // we'll take the first of this page as the start
        if (!selection && Number.isInteger(lastIndex)) {
          onSelectionStart({ index: 0, page: pageNumber, token: tokens[0] });
        }

        onSelectionEnd(
          Number.isInteger(lastIndex)
            ? { index: lastIndex, page: pageNumber, token: tokens[lastIndex] }
            : null
        );

        break;
      }
      case SelectionInPage.Both: {
        const position1 = scaleMousePosition(
          mouseSelection[0],
          originalPageHeight,
          originalPageWidth,
          pageImageWrapperRef.current
        );

        const position2 = scaleMousePosition(
          mouseSelection[1],
          originalPageHeight,
          originalPageWidth,
          pageImageWrapperRef.current
        );

        if (!position1 || !position2) break;

        const [x1, y1] = position1;
        const [x2, y2] = position2;

        const intersectingIndices = rtree.search(x1, y1, x2, y2);
        const firstIndex = Math.min(...intersectingIndices);
        const lastIndex = Math.max(...intersectingIndices);

        onSelectionStart(
          Number.isInteger(firstIndex)
            ? { index: firstIndex, page: pageNumber, token: tokens[firstIndex] }
            : null
        );
        onSelectionEnd(
          Number.isInteger(lastIndex)
            ? { index: lastIndex, page: pageNumber, token: tokens[lastIndex] }
            : null
        );
        break;
      }
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
    tokens,
  ]);

  return (
    <Paper className={classes.root} ref={pageImageWrapperRef}>
      {imageSrc && <img className={classes.image} src={imageSrc} alt={"Page " + pageNumber} />}

      {tokens && (
        <svg className={classes.svg} viewBox={`0 0 ${originalPageWidth} ${originalPageHeight}`}>
          {annotationRectangles.map((rectangle: Rectangle, index: number) => (
            <rect
              key={`annotation-${index}`}
              className={clsx(
                classes.rect,
                focusingAnnotation &&
                  rectangle.annotationIndex === focusedAnnotationIndex &&
                  classes.rectFocused
              )}
              x={rectangle.left - RECTANGLE_PADDING}
              y={rectangle.top - RECTANGLE_PADDING}
              onClick={(event: React.MouseEvent): void => {
                event.preventDefault();
                event.stopPropagation();
                onAnnotationFocus(rectangle.annotationIndex);
              }}
              width={rectangle.right - rectangle.left + 2 * RECTANGLE_PADDING}
              height={rectangle.bottom - rectangle.top + 2 * RECTANGLE_PADDING}
              style={{ fill: topicToColor(rectangle.annotationTopic) }}
            />
          ))}

          {searchResultRectangles.map((rectangle: BoundingBox, index: number) => (
            <rect
              key={`search-result-${index}`}
              className={classes.searchResult}
              x={rectangle.left - RECTANGLE_PADDING}
              y={rectangle.top - RECTANGLE_PADDING}
              width={rectangle.right - rectangle.left + 2 * RECTANGLE_PADDING}
              height={rectangle.bottom - rectangle.top + 2 * RECTANGLE_PADDING}
            />
          ))}

          {selectionRectangles.map((rectangle: BoundingBox, index: number) => (
            <rect
              key={`selection-${index}`}
              className={classes.selection}
              x={rectangle.left - RECTANGLE_PADDING}
              y={rectangle.top - RECTANGLE_PADDING}
              width={rectangle.right - rectangle.left + 2 * RECTANGLE_PADDING}
              height={rectangle.bottom - rectangle.top + 2 * RECTANGLE_PADDING}
            />
          ))}
        </svg>
      )}
    </Paper>
  );
};

export const EmptyViewbox = (): JSX.Element => {
  const classes = useStyles();
  return <Paper className={classes.root}></Paper>;
};

export default Viewbox;
