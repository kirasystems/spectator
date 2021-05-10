# Document Viewer

The document viewer is a React component built in Typescript that allows a user to highlight parts of the text in order to create annotations.

## Getting started

You will need [node](https://nodejs.org/en/download/package-manager/) and [yarn](https://yarnpkg.com/getting-started/install).

`yarn install` to install the document viewer's dependencies.

There's a playground that enables faster local development with a very simple test document (see `playground` folder).
It uses (MirageJS)[https://miragejs.com/] to mock the server API.

1. `yarn install` in the `playground` directory.
2. `yarn start` will start server with hot-reload. Simply navigate to [http://localhost:1234](http://localhost:1234).

`yarn build` packages the component so that it's ready to be used in another project.

## React component

The component can be rendered in any space, but it is recommended to allow the component to use all the width and height of the viewport for optimal usage.

A quick example of how to use it would be:

```
<div className="App" style={{height: "100%", width: "100%", margin: "0"}}>
  <DocumentViewer
    annotations={[{
      characterStart: 0,
      characterEnd: 19,
      pageStart: 1,
      pageEnd: 1,
      top: 304,
      left: 301,
      topic: "1"
    }]}
    name={"document.pdf"}
    lazyLoadingWindow={5}   // optional
    onAnnotationCreate={(annotation => console.log(annotation))}
    onAnnotationDelete={(annotation => console.log(annotation))}
    onClose={() => console.log('Close')}
    onNextDocument={() => console.log('Next')}
    onPreviousDocument={() => console.log('Previous')}
    pages={[{
      originalHeight: 842,
      originalWidth: 595,
      imageURL: "api/document/1/page/1/image",
      tokensURL: "api/document/1/page/1/tokens"
    }]}
    topics={["1", "2", "3"]}
  />
</div>
```

### Material UI

The new version of the Document Viewer uses Material UI. It allows [theming](https://material-ui.com/customization/theming/) of the document viewer.
Prefer refer to `packages/server/web` for an example of how to use it in your app.

Note: Bundling multiple versions of Material UI can have [interesting consequences](https://material-ui.com/getting-started/faq/#why-arent-my-components-rendering-correctly-in-production-builds). To prevent these issues, it's been added a peer dependency. Moreover, it's also possible to pass in the classname generator of your app to prevent clashing of classnames using the `muiClassGenerator` property.

### Concepts

As a document viewer is somewhat of a complex user interface to build, it requires some concepts to be understood:

- `annotations`: They are the highlights in the text. An `annotation` is mainly defined by the [`characterStart` `characterEnd`[ pair and should, as much as possible, correspond with the start and the end of a word. If the annotation doesn't wrap nicely, the document viewer will do its best to try to map it to the closest words.
  - `characterStart`: The 0-based index of the first character of the highlight.
  - `characterEnd`: The 0-based index of the last character of the highlight.
  - `pageStart`: The 1-based index of the page containing `characterStart`.
  - `pageEnd`: The 1-based index of the page containing `characterEnd`.
  - `top` and `left` corresponds to the `top` and `left` position, in pixels, of the first character of the annotation in the original document. It is used to be able to jump directly to annotations.
  - `topic`: The string representation of the topic.
- `name`: The name of the document.
- `lazyLoadingWindow` (optional): As the document viewer is taking care of lazy loading the pages, it defines how many pages on both sides needs to be loaded. A value of 1 will mean to load 3 pages (-1, current, +1).
- `muiClassGenerator` (optional): The class generate to be used to prevent classname clashing.
- `onAnnotationCreate`: A callback used when a user highlights text and then click on a topic.
- `onAnnotationDelete`: A callback used when a user clicks on the `X` of an annotation.
- `onClose`: A callback used when a user clicks on the `X` of the document viewer.
- `onNextDocument`: A callback used when a user clicks on the `->` of the document viewer.
- `onPreviousDocument`: A callback used when a user clicks on the `<-` of the document viewer.
- `pages`: The definition of all pages. The page are lazy loaded which is why it requires some URLs in its definition.
  - `originalHeight`: The height, in pixels, of the original document. It is used to be able to create a translate the position of the mouse to something we can use the R-tree with.
  - `originalWidth`: The width, in pixels, of the original document. It is used to be able to create a translate the position of the mouse to something we can use the R-tree with.
  - `imageURL`: The URL to the image of the page. The PNG format is recommended as it performs well for our scenario. It's also possible to provide a callback.
  - `tokensURL`: The URL to the tokens of the page. It's also possible to provide a callback. A token is defined by:
    - `line`: The 0-based index of the line containing the token. The line is supposed to reset to 0 when it's a new page.
    - `characterStart`: The 0-based index of the first character of the token.
    - `characterEnd`: The 0-based index of the last character of the token.
    - `boundingBox`: The enclosing box wrapping the token.
      - `top`: Position in pixels of `top` in the original document.
      - `bottom`: Position in pixels of `bottom` in the original document.
      - `left`: Position in pixels of `left` in the original document.
      - `right`: Position in pixels of `right` in the original document.
- `topics`: An order list of topics (strings) to choose from.
- `searchResults`: A list of passages to be highlighted. They are conceptually similar to `annotations`, but will have a different colour.
- `Summary`: A component that will be rendered on the left side of the pages. It's meant to be use to display extra information about the document i.e. a list of all the annotations. It takes, at a miniumum, the props defined in the `SummaryProps` type (including a ref to the `PagesHandle` to allow scrolling to specific elements) and everything passed in `summaryProps`.
- `summaryProps`: The "user-defined" props that will be pass to the `Summary` component.

### Design

The document viewer loads the original image of the pages and overlays an R-tree containing all the tokens in the page. When a user selects text, in reality, it keeps track of the mouse position, will translate the coordinates to what it will be in the original document. It will then query the R-tree and return the tokens that intersect with the rectangle created by the selection. As highlighting a passage in the text happens way less often than reading the document, we made the tradeoff of keeping the visualization part of the document viewer simple (loading the original image) while bringing more complexity on the text selection part.

### A word on annotation colours

To have a maximal number of distinct colours (12 colours), we used a [generator](http://colorbrewer.org). As we don't want the highlight to block the text, we reduced the opacity of the colours and we used the css property `mix-blend-mode` to `multiply`. It still doesn't prevent a user from massively highlighting the text to a point you can't see the text well.

## Features that are left out (for now)

- Copying text.
- Nuanced behaviour tracking.
- Mobile/Tablet support.
