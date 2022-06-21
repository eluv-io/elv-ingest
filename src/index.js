import React from "react";
import ReactDOM from "react-dom/client";
import {rootStore} from "Stores";

/* eslint-disable no-console */
window.js = content => console.log(JSON.stringify(content, null, 2));

import "Assets/stylesheets/app.scss";
import {observer} from "mobx-react";
import ContentCreation from "Components/content-creation/index";
import AsyncComponent from "Components/common/AsyncComponent";

const App = observer(() => {
  return (
    <div className="app-container">
      <AsyncComponent
        Load={() => rootStore.Initialize()}
        Render={() => <ContentCreation />}
      />
    </div>
  );
});

const rootElement = ReactDOM.createRoot(document.getElementById("app"));

rootElement.render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);
