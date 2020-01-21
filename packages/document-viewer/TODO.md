[X] Scolling page changes page number
[X] Cursor text on pages
[X] Select/Focus extraction
[X] Scrolling to an extraction
--- 
[X] Add to the summary (topic) -- stick to fixed for now
[X] Polish selecting -- case where you start from another page (empty tokens)
[X] Colors (12)
[X] Type everything
[X] Polishing UI
[X] Prettify code
[X] Add the shift shortcut to append
[X] Handle selection when scrolling
--- 
[X] Lazy loading pages
[X] Save the tokens within the selection so that you don't have to find them on annotation
[X] Default page image
---
[X] Group annotation labels
[X] Highlight seems a little off (bottom to low)
[X] Resize page
[X] Page input needs to be better
[X] Lazy load glitch -> Need one component for size and then dispatch
[X] Topics
[X] Stop loading when scrolling

[] Make sure you can jump to pages and annotations (from load)
[] Better EmptyPage
[] Tests
[] Add props validation for document viewer
[] Experiment with top-left, top-right, bottom-left and bottom-right selections


-- ASK MICHELLE & ADAM
[] Scroll when mouse is up or down (hotspots) ->> Outside or inside? if inside, awkward when you highlight something close to the end


Relevant Types: 

export type Annotation = {
    characterStart: number; // Camel case is good?
    characterEnd: number;
    pageStart: number;
    pageEnd: number;
    top: number;  // should we add pixel in the name like topPixel?
    left: number;
    topic: string;
};

export type BoundingBox = {
    top: number; // should we add pixel in the name like topPixel?
    left: number;
    right: number;
    bottom: number;
};

export type Token = { 
    line: number; // should we change it for lineNumber? Also we'll need to document it's per page (resets on a new page)
    boundingBox: BoundingBox;
    characterStart: number;
    characterEnd: number;
};


However, I'm not sure about the following

---------------- Alternative 1
We split pages data in 2; page dimensions and page data.
The user needs to provided a complete and ordered array of PageDimensions and a potentially partial list of PageDatum (ordered or not to be defined).
If a user doesn't want to have lazy loading, then they should provide a complete list of pageDatum.
If a user wants to have lazy loading, it would provide the first couple of pages at first and then we could have a callback everything the page changes so that they could load more pages on demand.

export type PageDimension = {
    originalHeight: number;
    originalWidth: number;
};

export type PageDatum = {
    pageNumber: number;
    imageURL: string;
    tokens: Token[];
};

Example:
<DocumentViewer
    pageDimensions={complete PageDimensions[]}
    pageData={partial PageData[]}/>

---------------- Alternative 2  <- Chosen
We ask the user to provide endpoints (url) to fetch the image and the tokens. 
It means that we will only support json endpoints for tokens and that it should be exactly of a given format.
It also means that we complete take control of the lazy loading and define a window (possibly configurable), but we are responsible to call the urls and tokens.

export type Page = {
    originalHeight: number;
    originalWidth: number;
    imageURL: string;
    tokensURL: string;
};

Example:
<DocumentViewer
    pages={complete Page[]}/>
