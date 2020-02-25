import React, { useRef } from "react";

import debounce from "lodash.debounce";

import Select from "../ui/select/index";
import { UpButton, DownButton } from "../ui/iconbutton/index";

import { NavigationModes } from "../../enums";

import "./style.css";

export const DEFAULT_NAVIGATION_MODE = NavigationModes.Page;

export const Zooms = [25, 50, 75, 100, 125, 150, 175, 200];
export const DEFAULT_ZOOM = Zooms[3];

type ToolBarProps = {
  navigationMode: NavigationModes;
  onNavigationModeChange: (navigationMode: NavigationModes) => void;

  navigationIndex: number;
  navigationTotal: number;
  onNavigationIndexChange: (navigationItem: number) => void;

  zoom: number;
  onZoomChange: (zoom: number) => void;
};

export const ToolBar = (props: ToolBarProps) => {
  const {
    navigationMode,
    onNavigationModeChange,
    navigationIndex,
    navigationTotal,
    onNavigationIndexChange,
    zoom,
    onZoomChange
  } = props;

  const [inputValue, setInputValue] = React.useState<string>(navigationIndex.toString()); 

  const inputRef = useRef<HTMLInputElement>(null);

  const handleNavigationChange = (
    event: React.ChangeEvent<any>
  ) => {
    onNavigationModeChange(event.target.value as NavigationModes);
  };

  const handleZoomChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onZoomChange(parseInt(event.target.value));
  };

  const handleNavigationItemUp = () => {
    onNavigationIndexChange(navigationIndex - 1);
  };

  const handleNavigationItemDown = () => {
    onNavigationIndexChange(navigationIndex + 1);
  };

  const handleNavigationItemBlur = React.useCallback(() => {
    setInputValue(navigationIndex.toString());
  }, [navigationIndex]);

  const confirmInput = React.useMemo(() => {
    return debounce(() => {
      if (!inputRef || !inputRef.current) return;
  
      let value = parseInt(inputRef.current.value);

      if (value > 0 && value <= navigationTotal) {
        onNavigationIndexChange(value);
      }
    }, 750);
  }, [navigationTotal, onNavigationIndexChange]);
  

  const handleNavigationItemChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setInputValue(event.target.value);
    confirmInput();
  };

  const handleNavigationItemKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (event.key !== "Enter") return;
    confirmInput.flush();
  }, [confirmInput]);

  React.useEffect(() => {
    setInputValue(navigationIndex.toString());
  }, [navigationIndex]);

  return (
    <div className="Toolbar">
      <Select
        className="Toolbar__Modes"
        onChange={handleNavigationChange}
        value={navigationMode}
      >
        {Object.keys(NavigationModes).map(key => (
          <option
            key={key}
            value={NavigationModes[key as keyof typeof NavigationModes]}
          >
            {key}
          </option>
        ))}
      </Select>

      <span className="Toolbar__Pages">
        <input
          ref={inputRef}
          className="Toolbar__Input"
          type="number"
          onChange={handleNavigationItemChange}
          onBlur={handleNavigationItemBlur}
          onKeyDown={handleNavigationItemKeyDown}
          value={inputValue}
          min={1}
          max={navigationTotal}
          step={1}
        />

        <span>{"/ " + navigationTotal}</span>

        <UpButton onClick={handleNavigationItemUp} title="Previous page" />
        <DownButton onClick={handleNavigationItemDown} title="Next page" />
      </span>

      <Select
        className="Toolbar__Zoom"
        onChange={handleZoomChange}
        value={zoom}
      >
        {Zooms.map(value => (
          <option key={value} value={value}>
            {value + "%"}
          </option>
        ))}
      </Select>
    </div>
  );
};
