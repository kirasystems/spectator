import React from "react";
import { DebouncedFunc, debounce } from "lodash";
import clsx from "clsx";

import { Grid, IconButton, Paper, TextField, Toolbar, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { ChevronLeft, ChevronRight, Close, ExpandLess, ExpandMore } from "@material-ui/icons";

const useStyles = makeStyles(theme => ({
  grow: {
    flexGrow: 1,
  },
  icon: {
    color: "white",
    padding: theme.spacing(1),
    "&.Mui-disabled": {
      color: theme.palette.grey[500],
    },
  },
  input: {
    fontSize: "14px",
    fontWeight: 400,
    padding: theme.spacing(1.25),
  },
  number: {
    color: "black",
    backgroundColor: "white",
    width: 36,
    "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
      "-webkit-appearance": "none",
      margin: 0,
    },
  },
  numberInput: {
    "-moz-appearance": "textfield",
    textAlign: "center",
  },
  numberRoot: {
    borderRadius: 0,
  },
  pages: {
    color: "white",
    fontSize: "14px",
    fontWeight: 400,
    margin: theme.spacing(0, 1),
  },
  separator: {
    color: "white",
    fontSize: "14px",
    fontWeight: 400,
    marginLeft: theme.spacing(1),
  },
  pageCount: {
    color: "white",
    fontSize: "14px",
    fontWeight: 400,
    marginRight: theme.spacing(1),
    marginLeft: theme.spacing(0.5),
  },
  title: {
    fontSize: "16px",
    fontWeight: 600,
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    flexFlow: "wrap",
  },
  gridTitle: {
    order: 1,
  },
  gridPages: {
    order: 2,
    [theme.breakpoints.down("sm")]: {
      order: 3,
    },
  },
  gridNavigation: {
    order: 3,
    [theme.breakpoints.down("sm")]: {
      order: 2,
    },
  },
  sourceLink: {
    marginRight: theme.spacing(1),
  },
}));

type NavBarProps = {
  documentName: string;
  SourceLink?: JSX.Element;

  navigationIndex: number;
  navigationTotal: number;
  onNavigationIndexChange: (navigationItem: number) => void;

  onClose: () => void;
  onNextDocument?: () => void;
  onPreviousDocument?: () => void;
};

const NavBar = (props: NavBarProps): JSX.Element => {
  const {
    documentName,
    SourceLink,
    navigationIndex,
    navigationTotal,
    onClose,
    onNavigationIndexChange,
    onNextDocument,
    onPreviousDocument,
  } = props;

  const classes = useStyles();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [inputValue, setInputValue] = React.useState<string>(navigationIndex.toString());

  const handleNavigationItemUp = (): void => {
    onNavigationIndexChange(navigationIndex - 1);
  };

  const handleNavigationItemDown = (): void => {
    onNavigationIndexChange(navigationIndex + 1);
  };

  const handleNavigationItemBlur = React.useCallback((): void => {
    setInputValue(navigationIndex.toString());
  }, [navigationIndex]);

  const confirmInput = React.useMemo((): (() => void) & DebouncedFunc<() => void> => {
    return debounce(() => {
      if (!inputRef || !inputRef.current) return;

      const value = parseInt(inputRef.current.value);

      if (value > 0 && value <= navigationTotal) {
        onNavigationIndexChange(value);
      }
    }, 750);
  }, [navigationTotal, onNavigationIndexChange]);

  const handleNavigationItemChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setInputValue(event.target.value);
    confirmInput();
  };

  const handleNavigationItemKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== "Enter") return;
      confirmInput.flush();
    },
    [confirmInput]
  );

  React.useEffect(() => {
    setInputValue(navigationIndex.toString());
  }, [navigationIndex]);

  return (
    <Toolbar className={classes.toolbar}>
      <Grid className={classes.gridTitle} item md={4} xs={6}>
        <Typography className={classes.title} variant="h3" color="inherit" noWrap>
          {documentName}
        </Typography>
      </Grid>

      <Grid
        className={classes.gridPages}
        container
        item
        md={4}
        xs={12}
        alignItems="center"
        wrap="nowrap"
        justify="center"
      >
        <Typography className={classes.pages} variant="body1" display="inline" noWrap>
          Pages
        </Typography>

        <TextField
          className={classes.number}
          inputRef={inputRef}
          type="number"
          onChange={handleNavigationItemChange}
          onBlur={handleNavigationItemBlur}
          onKeyDown={handleNavigationItemKeyDown}
          value={inputValue}
          inputProps={{
            min: 1,
            max: navigationTotal,
          }}
          InputProps={{
            classes: {
              root: classes.numberRoot,
              input: clsx(classes.input, classes.numberInput),
            },
          }}
          variant="outlined"
        />

        <Typography className={classes.separator} variant="body1" display="inline" noWrap>
          {"/"}
        </Typography>
        <Typography
          id="page-count"
          className={classes.pageCount}
          variant="body1"
          display="inline"
          noWrap
        >
          {navigationTotal}
        </Typography>

        <IconButton
          aria-label={"Previous Page"}
          className={classes.icon}
          disabled={navigationIndex <= 1}
          onClick={handleNavigationItemUp}
        >
          <ExpandLess />
        </IconButton>
        <IconButton
          aria-label={"Next Page"}
          className={classes.icon}
          disabled={navigationIndex >= navigationTotal}
          onClick={handleNavigationItemDown}
        >
          <ExpandMore />
        </IconButton>
      </Grid>

      <Grid
        className={classes.gridNavigation}
        container
        item
        md={4}
        xs={6}
        justify="flex-end"
        alignItems="center"
        wrap="nowrap"
      >
        {SourceLink && (
          <Paper className={classes.sourceLink} elevation={0}>
            {SourceLink}
          </Paper>
        )}

        <IconButton
          aria-label={"Previous Document"}
          className={classes.icon}
          disabled={!onPreviousDocument}
          onClick={onPreviousDocument}
        >
          <ChevronLeft />
        </IconButton>

        <IconButton
          aria-label={"Next Document"}
          className={classes.icon}
          disabled={!onNextDocument}
          onClick={onNextDocument}
        >
          <ChevronRight />
        </IconButton>

        <IconButton aria-label={"Close Document"} color="inherit" onClick={onClose}>
          <Close />
        </IconButton>
      </Grid>
    </Toolbar>
  );
};

export default NavBar;
