import React from "react";

import {
  Box,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  makeStyles,
} from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
  title: {
    fontWeight: 600,
  },
}));

type InfoProps = {
  zoom: string;
  onZoomChange: (newZoom: string) => void;
};

const Info = (props: InfoProps) => {
  const { onZoomChange, zoom } = props;

  const classes = useStyles();

  const handleZoomChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    onZoomChange(String(event.target.value));
  };

  return (
    <Box>
      <Typography className={classes.title} variant="h5" gutterBottom>
        Info
      </Typography>
      <InputLabel id="zoom-label">Zoom</InputLabel>
      <Select labelId={"zoom-label"} value={zoom} onChange={handleZoomChange}>
        <MenuItem value={"25%"}>25%</MenuItem>
        <MenuItem value={"50%"}>50%</MenuItem>
        <MenuItem value={"75%"}>75%</MenuItem>
        <MenuItem value={"100%"}>100%</MenuItem>
        <MenuItem value={"150%"}>150%</MenuItem>
        <MenuItem value={"200%"}>200%</MenuItem>
      </Select>
    </Box>
  );
};

export default Info;
