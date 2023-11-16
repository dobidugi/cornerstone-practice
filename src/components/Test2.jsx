import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { unstable_batchedUpdates } from "react-dom";
import cornerstone from "cornerstone-core";
import cornerstoneMath from "cornerstone-math";
import cornerstoneTools from "cornerstone-tools";
// import draw from "cornerstone-tools/drawing/draw";
import cornerstoneWebImageLoader from "cornerstone-web-image-loader";
import Hammer from "hammerjs";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import dicomParser from "dicom-parser";

const draw = cornerstoneTools.import("drawing/draw");
const drawTextBox = cornerstoneTools.import("drawing/drawTextBox");
const drawRect = cornerstoneTools.importInternal("drawing/drawRect");
const getNewContext = cornerstoneTools.import("drawing/getNewContext");

//Configure WADO-URI Loader
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
const config = {
  maxWebWorkers: navigator.hardwareConcurrency || 1,
  startWebWorkersOnDemand: true,
  taskConfiguration: {
    decodeTask: {
      initializeCodecsOnStartup: false,
      usePDFJS: false,
      strict: false,
    },
  },
};
cornerstoneWADOImageLoader.webWorkerManager.initialize(config);

const mriImages = [
  "dicomweb://raw.githubusercontent.com/ivmartel/dwv/master/tests/data/bbmri-53323707.dcm",
  "dicomweb://raw.githubusercontent.com/ivmartel/dwv/master/tests/data/bbmri-53323563.dcm",
  "dicomweb://raw.githubusercontent.com/ivmartel/dwv/master/tests/data/bbmri-53323419.dcm",
  "dicomweb://raw.githubusercontent.com/ivmartel/dwv/master/tests/data/bbmri-53323275.dcm",
  "dicomweb://raw.githubusercontent.com/ivmartel/dwv/master/tests/data/bbmri-53323131.dcm",
];
const segmantationImages = [
  "dicomweb:https://testdicombucket.s3.us-east-2.amazonaws.com/2a3c96dd-e659-470a-a83f-8c1f52752399.dcm",

  // "dicomweb://raw.githubusercontent.com/ivmartel/dwv/master/tests/data/bbmri-53323707.dcm",
  // "dicomweb://raw.githubusercontent.com/ivmartel/dwv/master/tests/data/bbmri-53323563.dcm",
  //   "dicomweb://raw.githubusercontent.com/ivmartel/dwv/master/tests/data/bbmri-53323419.dcm",
  //   "dicomweb://raw.githubusercontent.com/ivmartel/dwv/master/tests/data/bbmri-53323275.dcm",
  //   "dicomweb://raw.githubusercontent.com/ivmartel/dwv/master/tests/data/bbmri-53323131.dcm",
];

const layers = [
  {
    images: mriImages,
    layerId: "",
    options: {
      visible: true,
      opacity: 0.7,
      name: "MRI",
      viewport: {
        colormap: "",
      },
    },
  },
  // {
  //   images: segmantationImages,
  //   layerId: "",
  //   options: {
  //     name: "SEGMANTATION",
  //     visible: true,
  //     opacity: 0.7,
  //     viewport: {
  //       colormap: "",
  //       voi: {
  //         windowWidth: 30,
  //         windowCenter: 16,
  //       },
  //     },
  //   },
  // },
];

console.log(cornerstoneTools.ZoomTool);
const leftMouseToolChain = [
  { name: "Pan", func: cornerstoneTools.PanTool, config: {} },
  { name: "Magnify", func: cornerstoneTools.MagnifyTool, config: {} },
  { name: "Angle", func: cornerstoneTools.AngleTool, config: {} },
  { name: "Wwwc", func: cornerstoneTools.WwwcTool, config: {} },
  { name: "Eraser", func: cornerstoneTools.EraserTool, config: {} },
  { name: "Length", func: cornerstoneTools.LengthTool, config: {} },
  {
    name: "ArrowAnnotate",
    func: cornerstoneTools.ArrowAnnotateTool,
    config: {},
  },
  {
    name: "TextMarker",
    func: cornerstoneTools.TextMarkerTool,
    config: {
      configuration: {
        markers: ["F5", "F4", "F3", "F2", "F1"],
        current: "F5",
        ascending: true,
        loop: true,
      },
    },
  },
  {
    name: "EllipticalRoi",
    func: cornerstoneTools.EllipticalRoiTool,
    config: {},
  },
  {
    name: "CircleRoi",
    func: cornerstoneTools.CircleRoiTool,
    config: {},
  },
  {
    name: "RectangleRoi",
    func: cornerstoneTools.RectangleRoiTool,
    config: {},
  },
  {
    name: "Angle",
    func: cornerstoneTools.AngleTool,
    config: {},
  },
  {
    name: "DoubleTapFitToWindowTool",
    func: cornerstoneTools.DoubleTapFitToWindowTool,
    config: {},
  },
  {
    name: "WwwcRegion",
    func: cornerstoneTools.WwwcRegionTool,
    config: {},
  },
  {
    name: "FreehandRoi",
    func: cornerstoneTools.FreehandRoiTool,
    config: {},
  },
];

const Test2 = () => {
  const [wheelY, setWheelY] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const [layerIndex, setLayerIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [colorMapList, setColorMapList] = useState(
    cornerstone.colors.getColormapsList()
  );

  const [toolsStates, setToolsState] = useState([]);
  const [color, setColor] = useState("");
  const viewerRef = useRef(null);
  const leftMouseToolsRef = useRef(null);
  const [leftMouseTool, setLeftMouseTool] = useState(
    leftMouseToolChain[0].name
  );

  function loadImages(index = 0) {
    const promises = [];

    layers.forEach(function (layer) {
      if (layer.options.visible) {
        const loadPromise = cornerstone.loadAndCacheImage(layer.images[index]);
        promises.push(loadPromise);
      }
    });

    return Promise.all(promises);
  }

  const updateTheImages = useCallback(
    async (index) => {
      const images = await loadImages(index);

      images.forEach((image, index) => {
        image = { ...image, color: "red" };
        cornerstone.setLayerImage(
          viewerRef.current,
          image,
          layers[index].layerId
        );
        cornerstone.updateImage(viewerRef.current);
      });
    },
    [viewerRef]
  );

  useEffect(() => {
    if (!viewerRef.current) {
      return;
    }

    cornerstoneTools.external.cornerstone = cornerstone;
    cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
    cornerstoneWebImageLoader.external.cornerstone = cornerstone;
    cornerstoneTools.external.Hammer = Hammer;
    cornerstoneTools.toolColors.setToolColor("white");
    cornerstoneTools.toolColors.setActiveColor("red");
    // cornerstoneTools.toolColors.setHoverColor("yellow");
    cornerstoneTools.toolStyle.setToolWidth(2);

    cornerstoneTools.init({ showSVGCursor: true });
    // cornerstoneTools.setToolsState();

    cornerstone.enable(viewerRef.current);

    init();
    setTools();
    setEventListeners();
    drawText();

    return () => {
      removeEventListeners();
    };

    function removeEventListeners() {}

    function setEventListeners() {
      viewerRef.current.addEventListener(
        "cornerstonetoolsmousedrag",
        (event) => {
          // console.log(event.detail);
        }
      );
      viewerRef.current.addEventListener(
        "cornerstonetoolsmousewheel",
        (event) => {
          // scroll forward
          if (event.detail.detail.deltaY < 0) {
            setWheelY((position) => {
              if (position >= 1) {
                position = 1;
              } else {
                position += 1;
              }

              updateTheImages(position);
              return position;
            });
          } else {
            // scroll back
            setWheelY((position) => {
              if (position <= 0) {
                position = 0;
              } else {
                position -= 1;
              }

              updateTheImages(position);
              return position;
            });
          }
        }
      );
      // active layer가 변경되면 발동되는 이벤트
      viewerRef.current.addEventListener(
        "cornerstoneactivelayerchanged",
        function (e) {
          const layer = cornerstone.getActiveLayer(viewerRef.current);
          const colormap = layer.viewport.colormap;
          const opacity = layer.options.opacity;
          const isVisible = layer.options.visible;
          unstable_batchedUpdates(() => {
            setOpacity(opacity);
            setIsVisible(isVisible);
            setColor(colormap);
          });
        }
      );
    }
    function setTools() {
      // zoom
      const zoomTool = cornerstoneTools.ZoomTool;
      cornerstoneTools.addTool(zoomTool, {
        configuration: {
          invert: false,
          preventZoomOutsideImage: false,
          minScale: 0.1,
          maxScale: 20.0,
        },
      });
      cornerstoneTools.setToolActive("Zoom", { mouseButtonMask: 2 });

      for (let i = 0; i < leftMouseToolChain.length; i++) {
        if (i === 0) {
          // panning
          cornerstoneTools.addTool(leftMouseToolChain[i].func);
          cornerstoneTools.setToolActive(leftMouseToolChain[i].name, {
            mouseButtonMask: 1,
          });
        } else {
          console.log(
            "add ",
            leftMouseToolChain[i].name,
            leftMouseToolChain[i].config
          );
          cornerstoneTools.addTool(
            leftMouseToolChain[i].func,
            leftMouseToolChain[i].config
          );
          cornerstoneTools.setToolPassive(leftMouseToolChain[i].name, {
            mouseButtonMask: 1,
          });
        }
      }
    }

    async function init() {
      const images = await loadImages();
      images.forEach((image, index) => {
        const layer = layers[index];
        const layerId = cornerstone.addLayer(
          viewerRef.current,
          image,
          layer.options
        );
        layers[index].layerId = layerId;

        // segmantaion 이미지를 액티브 레이어로 설정한다.
        if (index === 1) {
          cornerstone.setActiveLayer(viewerRef.current, layerId);
        }

        // Display the first image
        // cornerstone(viewerRef.current);
      });
    }
  }, [updateTheImages]);

  const onClickToggleInterpolation = () => {
    const viewport = cornerstone.getViewport(viewerRef.current);
    viewport.pixelReplication = !viewport.pixelReplication;
    cornerstone.setViewport(viewerRef.current, viewport);
  };
  const onRemove = () => {
    leftMouseToolChain.forEach((item) => {
      cornerstoneTools.clearToolState(viewerRef.current, item.name);
    });
    cornerstone.updateImage(viewerRef.current);
  };

  const onInvert = () => {
    const viewport = cornerstone.getViewport(viewerRef.current);
    viewport.invert = ~viewport.invert;
    cornerstone.setViewport(viewerRef.current, viewport);
  };

  const onHFlip = () => {
    const viewport = cornerstone.getViewport(viewerRef.current);
    viewport.hflip = ~viewport.hflip;
    cornerstone.setViewport(viewerRef.current, viewport);
  };

  const onVFlip = () => {
    const viewport = cornerstone.getViewport(viewerRef.current);
    viewport.vflip = ~viewport.vflip;
    cornerstone.setViewport(viewerRef.current, viewport);
  };

  const drawText = () => {
    const el = document.getElementById("viewer");
    const enel = cornerstone.getEnabledElement(el);
    cornerstone.draw;
    const context = getNewContext(enel.canvas);
    draw(context, (context) => {
      drawTextBox(context, "TextTest: blujrllru", 0, 0, "yellow", {
        centering: false,
      });
    });
    // cornerstone.setViewport(viewerRef.current);
    // cornerstone.updateImage(viewerRef.current);
  };

  const onClickRotation = () => {
    const viewport = cornerstone.getViewport(viewerRef.current);
    viewport.rotation += 90;
    cornerstone.setViewport(viewerRef.current, viewport);
  };

  const onChangeVisibility = (event) => {
    setIsVisible((isVisible = true) => {
      isVisible = !isVisible;
      // false일 때 이미지 로딩하기
      // 만약 visible false로 두고 스크롤 시 visible false인 이미지는 loading하지 않음
      const layer = cornerstone.getActiveLayer(viewerRef.current);
      layer.options.visible = isVisible;
      if (isVisible) {
        updateTheImages(wheelY).then(() => {
          return isVisible;
        });
      } else {
        return isVisible;
      }
    });
    // cornerstone에서 object 값을 listen 한다.
    cornerstone.updateImage(viewerRef.current);
  };

  const onChangeOpacity = (event) => {
    const opacity = event.target.value;
    const layer = cornerstone.getActiveLayer(viewerRef.current);
    layer.options.opacity = opacity;
    cornerstone.updateImage(viewerRef.current);

    setOpacity(opacity);
  };

  const onChangeLayer = (event) => {
    const index = event.target.value;
    setLayerIndex(index);
    cornerstone.setActiveLayer(viewerRef.current, layers[index].layerId);
  };

  const onChangeColorMapList = (event) => {
    // greyscale 일 때 color map 이슈가 있음 https://github.com/cornerstonejs/cornerstone/issues/463
    const color = event.target.value;
    const layer = cornerstone.getActiveLayer(viewerRef.current);
    layer.viewport.colormap = color;
    setColor(color);
    cornerstone.updateImage(viewerRef.current);
  };

  const onLoadToolState = useCallback(() => {
    console.log("aa");
    cornerstoneTools.addToolState(viewerRef.current, "Length", {
      visible: true,
      active: false,
      invalidated: false,
      handles: {
        start: {
          x: 103.39740259740262,
          y: 73.74545454545455,
          highlight: true,
          active: false,
        },
        end: {
          x: 127.66753246753245,
          y: 159.52207792207793,
          highlight: true,
          active: false,
          moving: false,
        },
        textBox: {
          active: false,
          hasMoved: false,
          movesIndependently: false,
          drawnIndependently: true,
          allowedOutsideImage: true,
          hasBoundingBox: true,
          x: 127.66753246753245,
          y: 159.52207792207793,
          boundingBox: {
            width: 76.6943359375,
            height: 25,
            left: 712.5,
            top: 467.3125,
          },
        },
      },
      uuid: "42bfd96c-be52-415a-a474-b04e0adc3bc6",
      length: 89.14408741923415,
      unit: "mm",
    });
    cornerstoneTools.addToolState(viewerRef.current, "Length", {
      visible: true,
      active: false,
      invalidated: false,
      handles: {
        start: {
          x: 153.43376623376622,
          y: 69.02857142857142,
          highlight: true,
          active: false,
        },
        end: {
          x: 100.57142857142857,
          y: 207.33506493506493,
          highlight: true,
          active: false,
          moving: false,
        },
        textBox: {
          active: false,
          hasMoved: false,
          movesIndependently: false,
          drawnIndependently: true,
          allowedOutsideImage: true,
          hasBoundingBox: true,
          x: 153.43376623376622,
          y: 69.02857142857142,
          boundingBox: {
            width: 85.03662109375,
            height: 25,
            left: 790,
            top: 195.125,
          },
        },
      },
      uuid: "b501263b-51a6-48c8-84cf-366716ee7a0a",
      length: 148.06455649205427,
      unit: "mm",
    });
    cornerstone.updateImage(viewerRef.current);
  }, []);
  const onShowToolsState = useCallback(() => {
    leftMouseToolChain.forEach((tool) => {
      const state = cornerstoneTools.getToolState(
        viewerRef.current,
        tool.name
      )?.data;
      if (state === undefined) return;
      console.log(`${tool.name}`);
      console.log(cornerstoneTools.getToolState(viewerRef.current, tool.name));
      // prev.append({
      //   ...prev,
      //   [tool.name]: cornerstoneTools.getToolState(viewerRef.current, tool.name)
      //     ?.data,
      // });

      // setToolsState((prev) => {
      //   // return newState;
      // });
      // console.log(newState);
    });
  }, []);

  const onClickToggleInvert = (event) => {
    const viewport = cornerstone.getViewport(viewerRef.current);
    viewport.invert = ~viewport.invert;
    cornerstone.setViewport(viewerRef.current, viewport);
  };

  const onChangeLTools = (event) => {
    const toolName = event.target.value;
    for (let i = 0; i < leftMouseToolChain.length; i++) {
      if (leftMouseToolChain[i].name === toolName) {
        // panning
        cornerstoneTools.addTool(leftMouseToolChain[i].func);
        cornerstoneTools.setToolActive(leftMouseToolChain[i].name, {
          mouseButtonMask: 1,
        });
      } else {
        cornerstoneTools.addTool(leftMouseToolChain[i].func);
        cornerstoneTools.setToolPassive(leftMouseToolChain[i].name, {
          mouseButtonMask: 1,
        });

        // You can make tool disabled
        // cornerstoneTools.setToolDisabled(leftMouseToolChain[i].name, {
        //   mouseButtonMask: 1
        // });
        cornerstone.updateImage(viewerRef.current);
      }
    }

    setLeftMouseTool(toolName);
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <div>
        <label htmlFor="layer">Active layer: </label>
        <select id="layer" onChange={onChangeLayer} value={layerIndex}>
          <option value={0}>MRI</option>
          <option value={1}>SEGMANTATION</option>
        </select>

        <label htmlFor="wheelY"> wheelY: </label>
        <span id="wheelY">{wheelY}</span>

        <label htmlFor="opacity"> opacity: </label>
        <span id="opacity">{opacity}</span>
        <input
          type="range"
          onChange={onChangeOpacity}
          name="opacity"
          min="0"
          max="1"
          step="0.01"
          value={opacity}
        />

        <label htmlFor="layer"> Color map: </label>
        <select id="colorMap" value={color} onChange={onChangeColorMapList}>
          <option value="">None</option>
          {colorMapList.map((colorMapItem, index) => (
            <option key={colorMapItem.name + index} value={colorMapItem.id}>
              {colorMapItem.name}
            </option>
          ))}
        </select>

        <label htmlFor="visible"> visibility : </label>
        <input
          id="visible"
          type="checkbox"
          checked={isVisible}
          onChange={onChangeVisibility}
        />

        <button id="rotate" onClick={onClickRotation}>
          rotate 90
        </button>
        <button id="interpolation" onClick={onClickToggleInterpolation}>
          toggle interpolation
        </button>
        <button id="interpolation" onClick={onClickToggleInvert}>
          toggle invert
        </button>

        <button id="clear" onClick={onRemove}>
          remove All
        </button>

        <button id="showState" onClick={onShowToolsState}>
          show tools state
        </button>

        <button id="invert" onClick={onInvert}>
          Invert
        </button>

        <button id="hFlip" onClick={onHFlip}>
          hFlip
        </button>

        <button id="hFlip" onClick={onVFlip}>
          vFlip
        </button>

        <button id="loadToolsState" onClick={onLoadToolState}>
          loadToolState
        </button>

        <button id="writeText" onClick={drawText}>
          drawText
        </button>
        <form
          id="l-mouse-tools"
          ref={leftMouseToolsRef}
          onChange={onChangeLTools}
        >
          <label htmlFor="l-mouse-tools"> select L-mouse tool: </label>
          {leftMouseToolChain.map((tool) => (
            <Fragment key={tool.name}>
              <label htmlFor={tool.name}>{`| ${tool.name} =>`}</label>
              <input
                type="radio"
                name="l-mouse-tool"
                id={tool.name}
                value={tool.name}
                checked={tool.name === leftMouseTool}
              />
            </Fragment>
          ))}
        </form>
      </div>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div
          ref={viewerRef}
          id="viewer"
          style={{
            width: "100%",
            height: "80vh",
          }}
        />
      </div>
    </div>
  );
};

export default Test2;
