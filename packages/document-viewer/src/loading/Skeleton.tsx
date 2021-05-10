import { withStyles } from "@material-ui/core";
import MuiSkeleton from "@material-ui/lab/Skeleton";

export const TRANSITION_DELAY = "500ms";

const styles = () => ({
  "@global @keyframes pulse": {
    "0%": { backgroundColor: "rgba(0, 0, 0, 0.02)" },
    "50%": { backgroundColor: "rgba(0, 0, 0, 0.1)" },
    "100%": { backgroundColor: "rgba(0, 0, 0, 0.02)" },
  },
  root: {
    backgroundColor: "transparent",
  },
  pulse: {
    animation: `pulse 1.5s ease-in-out ${TRANSITION_DELAY} infinite`,
  },
});

const Skeleton = withStyles(styles)(MuiSkeleton) as typeof MuiSkeleton;

export default Skeleton;
