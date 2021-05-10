import React from "react";
import clsx from "clsx";
import {
  Link,
  useLocation,
  useRouteMatch,
  Switch,
  Redirect,
  Route,
} from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  SvgIcon,
  makeStyles,
} from "@material-ui/core";
import {
  BallotOutlined as BallotIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  InfoOutlined as InfoIcon,
} from "@material-ui/icons";

import Info from "./Info";
import Annotations from "./Annotations";

import { SummaryProps } from "document-viewer";
import { Annotation } from "../../../types";

const SIDEBAR_CLOSED_WIDTH = 56;
const SIDEBAR_OPEN_WIDTH = 450;

const useStyles = makeStyles((theme) => ({
  content: {
    padding: theme.spacing(3),
    flex: "1 1 100%",
    overflowX: "hidden",
    overflowY: "auto",
  },
  drawer: {
    width: SIDEBAR_OPEN_WIDTH,
    flexShrink: 0,
    whiteSpace: "nowrap",
    padding: 0,
    margin: 0,
  },
  drawerOpen: {
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: "hidden",
    width: SIDEBAR_OPEN_WIDTH,
    padding: 0,
  },
  drawerClose: {
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: "hidden",
    width: SIDEBAR_CLOSED_WIDTH,
    padding: 0,
  },
  icon: {
    margin: "auto",
    minWidth: 40,
    padding: theme.spacing(1, 0),
  },
  nav: {
    boxShadow: "2px 0px 5px rgba(0, 0, 0, 0.15)",
    flex: `0 0 ${SIDEBAR_CLOSED_WIDTH}px`,
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
  },
  sidebar: {
    backgroundColor: "white",
    display: "flex",
    height: "100%",
    padding: 0,
    margin: 0,
    paddingTop: theme.spacing(8),
  },
}));

type NavLinkProps = {
  Icon: typeof SvgIcon;
  route: string;
  title?: string;
};

const NavLink = (props: NavLinkProps): JSX.Element => {
  const { Icon, route, title } = props;
  const classes = useStyles();

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  return (
    <ListItem
      component={Link}
      aria-label={title}
      to={{
        pathname: route,
        search: searchParams.toString(),
      }}
    >
      <ListItemIcon className={classes.icon}>
        <Icon
          titleAccess={title}
          color={location.pathname.startsWith(route) ? "secondary" : "primary"}
        />
      </ListItemIcon>
    </ListItem>
  );
};

type ViewerSummaryProps = {
  annotations: Annotation[];
  onAnnotationDelete: (annotation: Annotation) => void;
};

const Summary = React.forwardRef(
  (
    props: SummaryProps & ViewerSummaryProps,
    ref: React.Ref<unknown>
  ): JSX.Element => {
    const { annotations, onAnnotationDelete, onZoomChange, viewerRef, zoom } =
      props;

    const classes = useStyles();
    const match = useRouteMatch();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);

    const [open, setOpen] = React.useState(true);

    const handleDrawerOpen = () => {
      setOpen(true);
    };

    const handleDrawerClose = () => {
      setOpen(false);
    };

    return (
      <Drawer
        ref={ref}
        variant="permanent"
        className={clsx(classes.drawer, {
          [classes.drawerOpen]: open,
          [classes.drawerClose]: !open,
        })}
        classes={{
          paper: clsx({
            [classes.drawerOpen]: open,
            [classes.drawerClose]: !open,
          }),
        }}
      >
        <Box
          className={classes.sidebar}
          display="flex"
          width="100%"
          overflow="hidden"
        >
          <Box className={classes.nav}>
            <List>
              <ListItem
                button
                aria-label={open ? "collapse" : "expand"}
                onClick={open ? handleDrawerClose : handleDrawerOpen}
              >
                <ListItemIcon className={classes.icon}>
                  {open ? (
                    <ChevronLeftIcon titleAccess="collapse" color="primary" />
                  ) : (
                    <ChevronRightIcon titleAccess="expand" color="primary" />
                  )}
                </ListItemIcon>
              </ListItem>
              <NavLink
                title="extractions"
                Icon={BallotIcon}
                route={`${match.url}/extractions`}
              />
              <NavLink
                title="info"
                Icon={InfoIcon}
                route={`${match.url}/info`}
              />
            </List>
          </Box>
          <Box className={classes.content}>
            <Switch>
              <Route path={`${match.url}/info`}>
                <Info zoom={zoom} onZoomChange={onZoomChange} />
              </Route>
              <Route path={`${match.url}/extractions`}>
                <Annotations
                  annotations={annotations}
                  onAnnotationDelete={onAnnotationDelete}
                  viewerRef={viewerRef}
                />
              </Route>
              <Redirect
                path={match.url}
                to={{
                  pathname: `${match.url}/extractions`,
                  search: searchParams.toString(),
                }}
              />
            </Switch>
          </Box>
        </Box>
      </Drawer>
    );
  }
);

export default Summary;
