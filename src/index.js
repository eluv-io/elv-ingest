import React from "react";
import {rootStore} from "Stores";
import {observer} from "mobx-react";

import "Assets/stylesheets/app.scss";
import ContentCreation from "Components/content-creation/index";
import AsyncComponent from "Components/common/AsyncComponent";
import {render} from "react-dom";

/* eslint-disable no-console */
window.js = content => console.log(JSON.stringify(content, null, 2));

const App = observer(() => {
  return (
    <React.StrictMode>
      <div className="app-container">
        <AsyncComponent
          Load={() => rootStore.Initialize()}
          Render={() => <ContentCreation />}
        />
      </div>
    </React.StrictMode>
  );
});

render(
  <App />,
  document.getElementById("app")
);
