import React from "react";
import { render } from "react-dom";

class ToolTip extends React.Component {
  /* Static not yet supported */
  // static toolTip;
  // static owner;

  constructor(props) {
    super(props);

    this.state = {
      hovering: false
    };

    this.MoveToolTip = this.MoveToolTip.bind(this);
  }

  componentDidUpdate() {
    if(ToolTip.toolTip) {
      this.ToggleTooltip(this.state.hovering);
    }
  }

  componentWillUnmount() {
    ToolTip.DestroyToolTip();
  }

  static CreateToolTip() {
    ToolTip.DestroyToolTip();

    if(ToolTip.toolTip) { return; }

    const newToolTip = document.createElement("div");
    newToolTip.style.position = "absolute";
    newToolTip.className = "-elv-tooltip";
    newToolTip.style.display = "none";
    newToolTip.style.zIndex = 10000;
    document.body.appendChild(newToolTip);

    ToolTip.toolTip = newToolTip;
  }

  static DestroyToolTip() {
    if(!ToolTip.toolTip) { return; }

    ToolTip.toolTip.parentNode.removeChild(ToolTip.toolTip);
    ToolTip.toolTip = undefined;
  }

  ToggleTooltip(show) {
    if(!ToolTip.toolTip) { return; }

    if(show && !!this.props.content) {
      ToolTip.toolTip.style.display = "flex";
      ToolTip.toolTip.className = `${this.props.className || ""} -elv-tooltip`;
      ToolTip.owner = this;

      render(
        this.props.content,
        ToolTip.toolTip
      );
    } else {
      if(ToolTip.owner === this) {
        ToolTip.toolTip.style.display = "none";
        ToolTip.owner = undefined;
      }
    }
  }

  MoveToolTip(x, y) {
    if(!ToolTip.toolTip || !this.props.content) { return; }

    if(!this.props.content) {
      ToolTip.toolTip.style.visibility = "hidden";
    }

    const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    const offset = 10;

    if(x > viewportWidth / 2) {
      ToolTip.toolTip.style.right = viewportWidth - x + "px";
      ToolTip.toolTip.style.left = "";
    } else {
      ToolTip.toolTip.style.left = x + offset + "px";
      ToolTip.toolTip.style.right = "";
    }

    if(y > viewportHeight / 2) {
      ToolTip.toolTip.style.bottom = viewportHeight - y + "px";
      ToolTip.toolTip.style.top = "";
    } else {
      ToolTip.toolTip.style.top = y + offset + "px";
      ToolTip.toolTip.style.bottom = "";
    }

    ToolTip.toolTip.style.visibility = "visible";
  }

  render() {
    return (
      React.cloneElement(
        React.Children.only(this.props.children),
        {
          onMouseEnter: (e) => {
            ToolTip.CreateToolTip();
            if(this.props.onMouseEnter) {
              this.props.onMouseEnter(e);
            }
            this.setState({hovering: true});
            this.MoveToolTip(e.clientX, e.clientY);
          },
          onMouseLeave: (e) => {
            ToolTip.DestroyToolTip();
            if(this.props.onMouseLeave) {
              this.props.onMouseLeave(e);
            }
            this.setState({hovering: false});
          },
          onMouseMove: (e) => {
            if(this.props.onMouseMove) {
              this.props.onMouseMove(e);
            }
            this.MoveToolTip(e.pageX, e.pageY);
          }
        }
      )
    );
  }
}

export default ToolTip;
