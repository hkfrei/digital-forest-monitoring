import { Control } from "ol/control";
import { WMSCapabilities } from "ol/format";
import TileLayer from "ol/layer/Tile";
import { TileWMS } from "ol/source";
import { getCenter } from "ol/extent";
import { MDCSlider } from "@material/slider";
import { MDCSwitch } from "@material/switch";
import { MDCChipSet, MDCChip } from "@material/chips";
import { MDCSelect } from "@material/select";
import { getLayerInfo, openSidebar } from "./main_util";

class ViewerControl {
  constructor({ map, title }) {
    this.map = map;
    this.title = title;
    this.changeOverlays = [
      {
        layername: "karten-werk:ndvi_decrease_2017_2018",
        displayName: "Juni 2017 - Juni 2018",
        description: `Difference between NDVI Maximum of 2018 and 2017, clipped to forest areas, Switzerland (expect small area in SW):
        Sentinel-2 NDVI maximum June & July for 2017
        Sentinel-2 NDVI maximum June & July for 2018
        This layer displays only areas where the ndvi has decreased e.g. areas of vegetation loss.
        Difference between 2018-2017`,
        visible: true
      },
      {
        layername: "karten-werk:ndvi_decrease_2017_2018_vector",
        displayName: "Testlayer - Dummy - 1",
        description: `Difference between NDVI Maximum of 2018 and 2017, clipped to forest areas, Switzerland (expect small area in SW):
        Sentinel-2 NDVI maximum June & July for 2017
        Sentinel-2 NDVI maximum June & July for 2018
        This layer displays only areas where the ndvi has decreased e.g. areas of vegetation loss.
        Difference between 2018-2017`,
        visible: false
      },
      {
        layername: "karten-werk:liegenschaften_pkgossau",
        displayName: "Testlayer - Dummy - 2",
        description: `Difference between NDVI Maximum of 2018 and 2017, clipped to forest areas, Switzerland (expect small area in SW):
        Sentinel-2 NDVI maximum June & July for 2017
        Sentinel-2 NDVI maximum June & July for 2018
        This layer displays only areas where the ndvi has decreased e.g. areas of vegetation loss.
        Difference between 2018-2017`,
        visible: false
      }
    ];
    this.overlays = [];
  }

  /*
   * creates an object which can be used to create a time based wms.
   * @param {string} time - iso date format e.g. "2017-08-25"
   * @returns {object} layer object to use in the createWmsLayer function.
   */
  getTimeLayerObject(date) {
    const fromDate = new Date(date);
    fromDate.setDate(fromDate.getDate() - 45);
    const from = fromDate.toLocaleDateString();
    const to = new Date(date).toLocaleDateString();
    return {
      layername: "karten-werk:nbr_change",
      time: date || "2017-08-25",
      displayName: `Veränderung ${date}`,
      description: `Veränderungsflächen vom <strong>${from}</strong> bis zum <strong>${to}</strong>.`,
      visible: true
    };
  }

  /*
   * creates the whole layer control for the "jaehrliche veränderung" viewer.
   * @returns {HTMLElement} veraenderungControlElement - a div with all the necessary children.
   */
  createControl({ type }) {
    const veraenderungFragment = new DocumentFragment();
    //title section
    const viewerTitle = document.createElement("div");
    viewerTitle.classList.add("viewerControl__title");
    viewerTitle.addEventListener("click", () => {
      const controlsHeight = this.viewerControls.getBoundingClientRect().height;
      if (controlsHeight === 0) {
        this.viewerControls.style.transform = "scale(1,1)";
        this.viewerControls.style.opacity = 1;
        titleArrow.style.transform = "rotate(0deg)";
      } else {
        this.viewerControls.style.opacity = 0;
        this.viewerControls.style.transform = "scale(1,0)";
        titleArrow.style.transform = "rotate(-90deg)";
      }
    });
    const title = document.createElement("span");
    title.style.flexGrow = 1;
    title.style.fontSize = "17px";
    title.innerHTML = this.title;
    const titleIcon = document.createElement("i");
    titleIcon.classList.add("material-icons");
    titleIcon.innerHTML = "tune";
    const titleArrow = document.createElement("i");
    titleArrow.classList.add("material-icons", "title__arrow");
    titleArrow.innerHTML = "keyboard_arrow_down";
    title.title = "Schaltflächen anzeigen";
    viewerTitle.appendChild(title);
    viewerTitle.appendChild(titleIcon);
    viewerTitle.appendChild(titleArrow);

    // add the necessary controls for every viewer.
    switch (type) {
      case "Natürliche Störungen":
        this.viewerControls = this.getStoerungControls();
        break;
      case "Jährliche Veränderung":
        // add only the visible:true layers on startup.
        this.overlays = this.changeOverlays.filter(
          layer => layer.visible === true
        );
        this.viewerControls = this.getVeraenderungControls();
        break;
      default:
        return;
    }
    veraenderungFragment.appendChild(viewerTitle);
    if (this.viewerControls) {
      veraenderungFragment.appendChild(this.viewerControls);
    }
    const veraenderungControl = new Control({
      element: veraenderungFragment
    });
    return veraenderungControl;
  }

  /*
   * create the controls for the "Jährliche Veranderung" viewer.
   */
  getVeraenderungControls() {
    const controls = document.createElement("div");
    controls.classList.add("viewerControl__controls");
    const dropdown = this.createLayerDropdown(this.changeOverlays);
    controls.appendChild(dropdown);
    const layers = document.createElement("div");
    layers.classList.add("layers");
    controls.appendChild(layers);
    this.createLayers({
      layers: this.overlays,
      domContainer: layers
    });
    return controls;
  }

  /*
   * removes layers from the ol map.
   * @param {array} layers - array of layer objects.
   */
  removeMapOverlays(layers) {
    layers.forEach(layer => this.map.removeLayer(layer.wmsLayer));
  }

  /*
   * creates a dropdown menu with new layers which can be added to the map.
   * @param {array} layers - layer objects which must be available in the dropdown.
   * @returns {htmlElement} - dropdown menu wich layers to choose.
   */
  createLayerDropdown(layers) {
    const dropdownContainer = document.createElement("div");
    dropdownContainer.classList.add("viewerControl__dropdown");
    const mdcSelect = document.createElement("div");
    mdcSelect.classList.add("mdc-select");
    const mdcSelectAnchor = document.createElement("div");
    mdcSelectAnchor.classList.add(
      "mdc-select__anchor",
      "viewerControl__layerselect"
    );
    const mdcSelectDropdownIcon = document.createElement("i");
    mdcSelectDropdownIcon.classList.add("mdc-select__dropdown-icon");
    mdcSelect.appendChild(mdcSelectAnchor);
    const mdcSelectText = document.createElement("div");
    mdcSelectText.classList.add("mdc-select__selected-text");
    const mdcSelectLabel = document.createElement("span");
    mdcSelectLabel.classList.add("mdc-floating-label");
    mdcSelectLabel.innerHTML = "Layer hinzufügen...";
    const mdcSelectRipple = document.createElement("div");
    mdcSelectRipple.classList.add("mdc-line-ripple");

    mdcSelectAnchor.appendChild(mdcSelectDropdownIcon);
    mdcSelectAnchor.appendChild(mdcSelectText);
    mdcSelectAnchor.appendChild(mdcSelectLabel);
    mdcSelectAnchor.appendChild(mdcSelectRipple);

    const mdcSelectMenu = document.createElement("div");
    mdcSelectMenu.classList.add(
      "mdc-select__menu",
      "mdc-menu",
      "mdc-menu-surface"
    );
    const mdcList = document.createElement("ul");
    mdcList.classList.add("mdc-list");
    const listItems = this.createDropdownList(layers);
    mdcList.appendChild(listItems);
    mdcSelectMenu.appendChild(mdcList);
    mdcSelect.appendChild(mdcSelectMenu);
    dropdownContainer.appendChild(mdcSelect);
    const select = new MDCSelect(mdcSelect);
    select.listen("MDCSelect:change", () => {
      const layer = this.changeOverlays.filter(
        overlay => overlay.displayName === select.value
      )[0];
      const layerInToc = this.overlays.filter(
        overlay => overlay.layername === layer.layername
      );
      if (layerInToc.length > 0) {
        console.log("layer allready in toc");
        return;
      }
      layer.visible = true;
      this.overlays.unshift(layer);
      // remove all overlays from the map
      this.removeMapOverlays(this.overlays);
      // @TODO
      // maybe this could be done better. dont' add every layer from scratch, but only the new one.
      // it is not as easy at it seems, because the consistency of the map layers with the layer controls.
      this.createLayers({
        layers: this.overlays,
        domContainer: document.querySelector(".layers")
      });
    });
    return dropdownContainer;
  }

  /*
   * creates the dropdown content with new layers which can be added to the map.
   * @param {array} layers - layer objects which must be available in the list.
   * @returns {documentFragement} - li elements
   */
  createDropdownList(layers) {
    const list = new DocumentFragment();
    layers.forEach(layer => {
      const li = document.createElement("li");
      li.classList.add("mdc-list-item");
      li.setAttribute("data-value", layer.displayName);
      li.innerHTML = layer.displayName;
      list.appendChild(li);
    });
    return list;
  }

  /*
   * create map layers and layer control elements and add layers to the map.
   * @param {object} params - function parameter obejct.
   * @param {array} params.layers - layer objects to produce overlays and control elements.
   * @param {htmlElement} params.domContainer - the container to append the layer controls.
   * @returns {htmlElement} domContainer - the container with all the attached layer controls or false.
   */
  createLayers({ layers, domContainer }) {
    if (!Array.isArray(layers) || !domContainer) {
      return false;
    }
    domContainer.innerHTML = "";
    if (layers.length === 0) {
      return false;
    }
    //add the layers to the map and the toc
    let i = layers.length - 1;
    while (i >= 0) {
      const overlay = layers[i];
      if (!overlay.wmsLayer) {
        overlay.wmsLayer = this.createWmsLayer(overlay);
      }
      this.map.addLayer(overlay.wmsLayer);
      domContainer.prepend(this.createLayerControl(overlay));
      i--;
    }
    return domContainer;
  }

  /*
   * create a layer control element.
   * @param {object} layer - layer obejct.
   * @returns {htmlElement} layer - layer control.
   */
  createLayerControl(layer) {
    const layerControl = document.createElement("div");
    layerControl.classList.add("viewerControl__controls-control");
    layerControl.appendChild(this.getSwitch({ overlay: layer }));
    layerControl.appendChild(this.getLayerRemoveButton(layer));
    layerControl.appendChild(this.getSlider(layer.wmsLayer));
    layerControl.appendChild(this.getLayerInfoButton(layer));
    return layerControl;
  }

  /*
   * create the controls for the "Natürliche Störungen" viewer.
   */
  getStoerungControls() {
    const controls = document.createElement("div");
    controls.classList.add("viewerControl__controls");
    const intro = document.createElement("div");
    intro.classList.add("viewerControl__helpertext");
    intro.innerHTML =
      "Wählen Sie ein Datum um Veränderungsflächen der letzten <br /><strong>45 Tage</strong> zu sehen.";
    controls.appendChild(intro);
    const yearInfo = document.createElement("div");
    yearInfo.classList.add("viewerControl__yearinfo");
    controls.appendChild(yearInfo);
    const dateChips = document.createElement("div");
    dateChips.classList.add("datechips");
    const chipsetEl = document.createElement("div");
    chipsetEl.classList.add("mdc-chip-set", "mdc-chip-set--filter");
    this.chipset = new MDCChipSet(chipsetEl);
    this.getDimensions().then(response => {
      const year = response[0].split("-")[0];
      yearInfo.innerHTML = `Jahr ${year}`;
      response.forEach(date => {
        const chipEl = this.createDateChip(date);
        const chip = new MDCChip(chipEl);
        chip.listen("click", () => {
          this.unselectChips({ chipset: this.chipset, id: chip.id });
          // remove all overlays from the map
          this.removeMapOverlays(this.overlays);
          // empty the disorder overlays because we want to display only one layer at the time.
          this.overlays = [];
          chip.selected = !chip.selected;
          const date = chipEl.dataset.name;
          if (chip.selected === false) {
            const disorderObj = this.getTimeLayerObject(date);
            this.overlays.push(disorderObj);
          } else {
            this.overlays = this.overlays.filter(
              overlay => overlay.time !== date
            );
          }
          //create new layer elements and ol TileLayers and add them to the dom.
          this.createLayers({
            layers: this.overlays,
            domContainer: layers
          });
        });
        chipsetEl.appendChild(chipEl);
        this.chipset.addChip(chipEl);
      });
    });
    const layers = document.createElement("div");
    layers.classList.add("layers");
    controls.appendChild(chipsetEl);
    controls.appendChild(layers);
    return controls;
  }

  /*
   * unselect all chips, except the one with the id from the function parameter.
   * @param {object} params - function parameter object.
   * @param {MDLChipset} params.chipset - the set with all the chips.
   * @param {string} params.id - the id of the string that should be selected.
   * @returns {MDLChipset} - chipset with updated chips.
   */
  unselectChips({ chipset, id }) {
    chipset.chips.forEach(chip => {
      if (chip.id !== id) {
        chip.selected = false;
      }
    });
    return chipset;
  }

  /*
   * get all the available time dimensions for the nbr_change layer.
   * @returns {promise} - promise with all the available time strings.
   */
  getDimensions() {
    const url = "https://geoserver.karten-werk.ch/wms?request=getCapabilities";
    const parser = new WMSCapabilities();
    return fetch(url)
      .then(response => response.text())
      .then(text => {
        const result = parser.read(text);
        const layers = result.Capability.Layer.Layer;
        const nbr = layers.filter(
          layer => layer.Name === "karten-werk:nbr_change"
        )[0];
        //center the map to the center of the nbr_change service extent.
        const extent = nbr.BoundingBox[1].extent;
        if (extent) {
          this.map.getView().setCenter(getCenter(extent));
        }
        const dimensions = nbr.Dimension[0].values.split(",");
        return dimensions;
      });
  }

  /*
   * create a single date chip for the "Natürliche Störungen" viewer.
   * @param {string} date - the text content of the chip.
   * @returns {htmlElement} chip - MDCChip markup
   */
  createDateChip(date) {
    const printDate = date.substring(0, 10);
    const chip = document.createElement("button");
    chip.setAttribute("data-name", `${printDate}`);
    chip.classList.add("mdc-chip");
    const checkmark = document.createElement("span");
    checkmark.classList.add("mdc-chip__checkmark");
    checkmark.innerHTML = `<svg class="mdc-chip__checkmark-svg" viewBox="-2 -3 30 30">
    <path class="mdc-chip__checkmark-path" fill="none" stroke="black"
          d="M1.73,12.91 8.1,19.28 22.79,4.59"/>
  </svg>`;
    const content = document.createElement("span");
    content.classList.add("mdc-chip__text");
    content.innerHTML = this.formatDateString(printDate);
    chip.appendChild(checkmark);
    chip.appendChild(content);
    return chip;
  }

  /*
   * creates a date string which can be used in a date chip e.g. 4.Apr.
   * @param {string} datestring - something like "2017-08-05".
   * @returns {string} result - string like "5.Apr."
   */
  formatDateString(datestring) {
    const monthstrings = [
      "Jan",
      "Feb",
      "Mrz",
      "Apr",
      "Mai",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Okt",
      "Nov",
      "Dez"
    ];
    const date = new Date(datestring);
    const day = date.getDate();
    const month = monthstrings[date.getMonth()];
    return `${day}.${month}.`;
  }

  /*
   * creates a ol wms overlay for a geoserver layer.
   * @param {object} overlay - overlay object like stored in the model.
   * @returns {object} TileLayer - ol.TileLayer instance.
   */
  createWmsLayer(overlay) {
    const url = "https://geoserver.karten-werk.ch/wms";
    const params = {
      LAYERS: `${overlay.layername}`,
      FORMAT: "image/png",
      SRS: "EPSG:3857"
    };
    if (overlay.time) {
      params.time = overlay.time;
    }
    const wmsLayer = new TileLayer({
      opacity: 1,
      source: new TileWMS({
        url,
        params,
        serverType: "geoserver",
        //do not fade tiles:
        transition: 0
      })
    });
    wmsLayer.name = `${overlay.layername}`;
    wmsLayer.setVisible(overlay.visible);
    return wmsLayer;
  }

  /*
   * creates the layer info (i) icon.
   * @param {object} overlay - overlay item like stored in this.changeOverlays.
   * @returns {HTMLElement} layerInfo - the info icon.
   */
  getLayerInfoButton(overlay) {
    const layerInfo = document.createElement("button");
    layerInfo.classList.add(
      "layer-button",
      "mdc-icon-button",
      "material-icons"
    );
    layerInfo.innerHTML = "info";
    layerInfo.addEventListener("click", () => {
      const content = new DocumentFragment();
      const title = document.createElement("h3");
      title.innerHTML = `${overlay.displayName}`;
      const description = document.createElement("div");
      description.innerHTML = getLayerInfo(overlay);
      content.appendChild(title);
      content.appendChild(description);
      openSidebar({ content });
    });
    return layerInfo;
  }

  getLayerRemoveButton(overlay) {
    const removeLayer = document.createElement("button");
    removeLayer.classList.add(
      "layer-button",
      "mdc-icon-button",
      "material-icons"
    );
    removeLayer.innerHTML = "delete";
    removeLayer.addEventListener("click", () => {
      this.removeMapOverlays(this.overlays);
      this.overlays = this.overlays.filter(
        item => item.displayName !== overlay.displayName
      );
      this.createLayers({
        layers: this.overlays,
        domContainer: document.querySelector(".layers")
      });
      if (this.chipset) {
        this.unselectChips({ chipset: this.chipset, id: "" });
      }
    });
    return removeLayer;
  }

  /*
   * creates the layer on/off switch.
   * @param {object} params - function parameter object.
   * @param {object} params.overlay - object like stored in this.changeOverlays but with a wmsLayer property.
   * @returns {DocumentFragment} switchFragment- the labeled switch.
   */
  getSwitch({ overlay } = {}) {
    const switchFragment = new DocumentFragment();
    const layerSwitch = document.createElement("div");
    const switchTrack = document.createElement("div");
    const thumbUnderlay = document.createElement("div");
    const thumb = document.createElement("div");
    const input = document.createElement("input");
    const label = document.createElement("label");
    layerSwitch.classList.add("mdc-switch");
    switchTrack.classList.add("mdc-switch__track");
    thumbUnderlay.classList.add("mdc-switch__thumb-underlay");
    thumb.classList.add("mdc-switch__thumb");
    input.classList.add("mdc-switch__native-control");
    input.type = "checkbox";
    input.id = `${overlay.layername}_switch`;
    input.checked = overlay.visible;
    input.setAttribute("role", "switch");
    if (overlay.wmsLayer && overlay.displayName) {
      input.addEventListener("change", e => {
        overlay.wmsLayer.setVisible(e.target.checked);
      });
    }

    label.for = "layer-switch";
    label.innerHTML = `${overlay.displayName}`;
    label.style.padding = "0 0 0 12px";
    label.style.flexGrow = 1;
    label.style.fontSize = "12px";
    thumb.appendChild(input);
    thumbUnderlay.appendChild(thumb);
    layerSwitch.appendChild(switchTrack);
    layerSwitch.appendChild(thumbUnderlay);
    switchFragment.appendChild(layerSwitch);
    switchFragment.appendChild(label);
    window.requestAnimationFrame(() => {
      new MDCSwitch(layerSwitch);
    });
    return switchFragment;
  }

  /*
   * creates the layer transparency slider.
   * @param {ol/TileLayer} - openlayers tile overlay.
   * @returns {DocumentFragment} slider - transparency slider.
   */
  getSlider(wmsLayer) {
    const sliderContainer = document.createElement("div");
    sliderContainer.classList.add("slidercontainer");
    const opacityIcon = document.createElement("i");
    opacityIcon.classList.add("material-icons");
    opacityIcon.innerHTML = "opacity";
    opacityIcon.title = "Transparenz";
    opacityIcon.style.padding = "0 12px 0 0";
    const slider = document.createElement("div");
    slider.id = `${wmsLayer.name}_slider`;
    slider.title = "Transparenz";
    slider.classList.add("mdc-slider", "mdc-slider--discrete");
    slider.tabIndex = "0";
    slider.setAttribute("role", "slider");
    slider.setAttribute("aria-valuemin", "0");
    slider.setAttribute("aria-valuemax", "100");
    slider.setAttribute("aria-valuenow", "100");
    slider.setAttribute("ariaLabel", "transparency slider");
    const trackContainer = document.createElement("div");
    const track = document.createElement("div");
    const thumbContainer = document.createElement("div");
    const thumbContainerContent = `<div class="mdc-slider__pin"><span class="mdc-slider__pin-value-marker">
    </span></div><svg class="mdc-slider__thumb" width="21" height="21">
    <circle cx="10.5" cy="10.5" r="7.875"></circle></svg><div class="mdc-slider__focus-ring"></div>`;
    trackContainer.classList.add("mdc-slider__track-container");
    track.classList.add("mdc-slider__track");
    thumbContainer.classList.add("mdc-slider__thumb-container");

    thumbContainer.innerHTML = thumbContainerContent;
    trackContainer.appendChild(track);
    slider.appendChild(trackContainer);
    slider.appendChild(thumbContainer);
    sliderContainer.appendChild(opacityIcon);
    sliderContainer.appendChild(slider);
    window.requestAnimationFrame(() => {
      const mdcslider = new MDCSlider(slider);
      mdcslider.listen("MDCSlider:input", e => {
        const opacity = parseFloat(
          e.target.getAttribute("aria-valuenow") / 100
        );
        wmsLayer.setOpacity(opacity);
      });
    });

    return sliderContainer;
  }
}
export default ViewerControl;