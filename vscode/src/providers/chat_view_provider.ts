import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import { logError, logEvent } from "../utilities/telemetry-reporter";
import { DiffViewAgent } from "../action-managers/diff-view-agent";
import { shortcutInlineCodeRefactor } from "../utilities/shortcut-hint-utils";
import {
  SetupManager,
  SetupStep,
} from "../utilities/setup-manager/setup-manager";
import { StorageManager } from "../utilities/storage-manager";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import {
  makeAuthorizedHttpRequest,
  makeHttpRequest,
  validateApiKey,
} from "../repository/http-utils";

export class FlutterGPTViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "dash.chatView";
  private _view?: vscode.WebviewView;
  private setupManager = SetupManager.getInstance();
  private _activeAgent: string = "";
  private tasksMap: any = {};
  private _publicConversationHistory: Array<{
    [agent: string]: {
      role: string;
      text: string;
      references?: Array<string>;
      messageId?: string;
      data?: any;
      buttons?: string[];
      agent?: string;
      slug?: string;
    };
  }> = [];
  /// reference documents for particular activated agent for througout chat history
  private chatDocuments: { [key: string]: string } = {};
  private _privateConversationHistory: Array<{
    role: string;
    parts: string;
    messageId?: string;
    data?: any;
  }> = [];

  // In the constructor, we store the URI of the extension
  constructor(
    private readonly _extensionUri: vscode.Uri,
    private context: vscode.ExtensionContext
  ) {}

  // Public method to post a message to the webview
  public postMessageToWebview(message: any): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    // set options for the webview, allow scripts
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    // set the HTML for the webview
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    // this.setupManager.deleteGithub();
    // add an event listener for messages received by the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "codeSelected": {
          break;
        }
        case "prompt": {
          this.getResponse(data.value);
          break;
        }

        case "mergeCode": {
          const editor = vscode.window.activeTextEditor;
          if (editor) {
            editor.edit((builder) => {
              if (editor.selection.isEmpty) {
                builder.insert(editor.selection.active, data.value);
              } else {
                builder.replace(editor.selection, data.value);
              }
            });
          }
          logEvent("merge-code", { from: "command-deck" });
          break;
        }
        case "copyCode": {
          logEvent("copy-code", { from: "command-deck" });
          break;
        }
        case "clearChat": {
          this.clearConversationHistory();
          break;
        }
        case "checkKeyIfExists": {
          this._checkIfKeyExists();
          break;
        }
        case "dashResponse": {
          const { data: _data, messageId, buttonType } = JSON.parse(data.value);
          const task = this.tasksMap[_data.taskId];
          const message = _data.message;

          if (buttonType === "accept") {
            task.sendStepResponse(message, { value: true });
          } else {
            task.sendStepResponse(message, { value: false });
          }
          const fileData = _data.message.params.args.file;
          const updatedMessage = await DiffViewAgent.handleResponse(
            buttonType,
            fileData,
            messageId
          );
          if (updatedMessage) {
            // this._publicConversationHistory[messageId] = updatedMessage;
            // this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
          }
          break;
        }
        case "agents": {
          this.handleChats(data.value.data, data.value.isCommandLess);
          break;
        }
        case "githubLogin": {
          this.setupManager.setupGithub();
          break;
        }
        case "initialized": {
          this._setupManager();
          webviewView.webview.postMessage({
            type: "shortCutHints",
            value: shortcutInlineCodeRefactor(),
          });
          break;
        }
        case "installAgents": {
          this._installAgent(data, webviewView.webview);
          break;
        }
        case "uninstallAgents": {
          this._uninstallAgent(data, webviewView.webview);
          break;
        }
        case "getInstallAgents": {
          this._getInstallAgents();
          break;
        }
        case "fetchAgents": {
          this._fetchAgentsAPI();
          break;
        }
        case "setMarketPlace": {
          this.setMarketPlaceWebView();
          break;
        }
      }
    });
    this._fetchAgentsAPI(true);
    this._migrateAgentsStorage();
    // StorageManager.instance.deleteAgents();

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible && this._view) {
        this._view?.webview.postMessage({ type: "focusChatInput" });
      }
    });

    vscode.window.onDidChangeActiveColorTheme(() => {
      webviewView.webview.postMessage({ type: "updateTheme" });
    });

    //TODO: move to first chat
    //TODO: market place event
    //TODO: on questionaire event
    //TODO: search agents on marketplace
    //TODO: following up message proper placement
    //TODO: Remove dart icon and show icons based on file type

    logEvent("new-chat-start", { from: "command-deck" });
    // this._installAgent();
    this.setMarketPlaceContext(false);
  }

  private setMarketPlaceContext(isMarketPlace: boolean) {
    vscode.commands.executeCommand(
      "setContext",
      "dash:isMarketPlace",
      isMarketPlace
    );
  }

  private async _uninstallAgent(data: any, webview: vscode.Webview) {
    try {
      const { value } = data;
      const _parsedAgent = JSON.parse(value);
      const existingAgents = await StorageManager.instance.getInstallAgents();
      const _parsedExsistingAgents = existingAgents
        ? JSON.parse(existingAgents)
        : { agents: {}, agentsList: [] };
      delete _parsedExsistingAgents.agents[`@${_parsedAgent.name}`];
      _parsedExsistingAgents.agentsList =
        _parsedExsistingAgents.agentsList.filter(
          (item: string) => item !== `@${_parsedAgent.name}`
        );
      StorageManager.instance
        .setInstallAgents(_parsedExsistingAgents)
        .then(() => {
          this._getInstallAgents();
        });
    } catch (error) {
      console.log("error while uninstalling agents: ", error);
    }
  }

  private async _updateInstalledAgents(response: any) {
    const getInstallAgents = await StorageManager.instance.getInstallAgents();
    const _getInstallAgents = JSON.parse(getInstallAgents);

    for (const agentName in _getInstallAgents.agents) {
      const matchedAgent = response.find((agent: any) => {
        let bool1 = agent.name === agentName.replace("@", "");
        let bool2 =
          agent.testing === _getInstallAgents.agents[agentName].testing;
        return bool1 && bool2;
      });

      if (matchedAgent) {
        const agentDetails = await this._fetchAgent(
          matchedAgent.name,
          matchedAgent.versions[0].version,
          matchedAgent.testing
        );
        this._storingAgentsLocally(agentDetails);
      }
    }
  }

  private async _fetchAgentsAPI(backgroundUpdate: boolean = false) {
    try {
      const config: AxiosRequestConfig = {
        method: "post",
        url: "https://api.commanddash.dev/agent/web/get-agent-list-v2",
        headers: {
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({cli_version: "0.0.1"}),
      };
      let response = await makeAuthorizedHttpRequest(config, this.context) as any;
      const allAgents = [
        ...(response?.public_agents?.agents ?? []),
        ...(response?.owned_agents?.agents ?? []),
        ...(response?.shared_agents?.agents ?? []),
        ...(response?.spotlight_agents?.agents ?? [])
      ];
      if (backgroundUpdate) {
        this._updateInstalledAgents(allAgents);
      } else {
        this._view?.webview.postMessage({
          type: "fetchedAgents",
          value: JSON.stringify(allAgents),
        });
      }
    } catch (error) {
      console.log("error: while fetching the get-agent-list api", error);
    }
  }

  private async _fetchAgent(name: string, version: string, testing: boolean) {
    const config: AxiosRequestConfig = {
      method: "post",
      url: "https://api.commanddash.dev/agent/get-agent",
      data: {
        testing: testing,
        cli_version: "0.0.1",
        name: name,
        version: version,
      },
    };
    const response = await makeAuthorizedHttpRequest(config, this.context);
    return response;
  }

  private async _installAgent(data: any, webview: vscode.Webview) {
    try {
      const { value } = data;
      const _parsedAgent = JSON.parse(value);
      // const agentDetails = ((await this._fetchAgent(
      //   _parsedAgent.name,
      //   _parsedAgent.versions[0].version,
      //   _parsedAgent.testing
      // )) as any) ?? { agent: { name: "", version: "" } };
      this._storingAgentsLocally(_parsedAgent);
    } catch (error) {
      console.error("Error installing agents:", error);
    }
  }

  private async _migrateAgentsStorage() {
    try {
      const existingAgents = await StorageManager.instance.getInstallAgents();
      const _parsedExsistingAgents = existingAgents
        ? JSON.parse(existingAgents)
        : { agents: {}, agentsList: [] };

      let isMigrationNeeded = false;

      const migratedAgents = Object.keys(_parsedExsistingAgents.agents).reduce(
        (acc: any, key: string) => {
          const agent = _parsedExsistingAgents.agents[key];
          if (!agent.search) {
            agent.search = `@${agent.metadata.display_name}`;
            isMigrationNeeded = true;
          }
          acc[key] = agent;
          return acc;
        },
        {}
      );

      if (isMigrationNeeded) {
        const updatedAgents = {
          agents: migratedAgents,
          agentsList: _parsedExsistingAgents.agentsList,
        };

        await StorageManager.instance.setInstallAgents(updatedAgents);
        console.log(
          "Migration completed: @search field added to existing agents."
        );
      }
    } catch (error) {
      console.error("Error during agents storage migration:", error);
    }
  }

  private async _storingAgentsLocally(agentDetails: any) {
    try {
      const { name, metadata } = agentDetails;

      // StorageManager.instance.deleteAgents();
      const existingAgents = await StorageManager.instance.getInstallAgents();
      const _parsedExsistingAgents = existingAgents
        ? JSON.parse(existingAgents)
        : { agents: {}, agentsList: [] };

      const updatedAgents = {
        agents: {
          ..._parsedExsistingAgents?.agents,
          [`@${name}`]: {
            ...agentDetails,
            name: `@${name}`,
            search: `@${metadata.display_name}`,
            supported_commands: agentDetails?.supported_commands?.map(
              (command: any) => ({
                ...command,
                slug: `/${command.slug}`,
              })
            ),
          },
        },
        agentsList: [
          ...new Set([..._parsedExsistingAgents?.agentsList, `@${name}`]),
        ],
      };

      StorageManager.instance.setInstallAgents(updatedAgents).then(() => {
        this._getInstallAgents();
      });
    } catch (error) {
      console.error("Error installing agents:", error);
    }
  }

  private async _getInstallAgents() {
    StorageManager.instance
      .getInstallAgents()
      .then((agents) => {
        if (agents) {
          this._view?.webview.postMessage({
            type: "getStoredAgents",
            value: { agents },
          });
        }
      })
      .catch((error) => {
        console.log("Error in getting installed agents", error);
      });
  }

  private async _setupManager() {
    this.setupManager = SetupManager.getInstance();
    await this.setupManager.updatePendingSteps();
    this._view?.webview.postMessage({
      type: "pendingSteps",
      value: JSON.stringify(this.setupManager.pendingSetupSteps),
    });

    this.setupManager.onDidChangeSetup((event) => {
      switch (event) {
        case SetupStep.github:
          this._view?.webview.postMessage({ type: "githubLoggedIn" });
          break;
      }
    });
  }

  private _checkIfKeyExists() {
    const config = vscode.workspace.getConfiguration("fluttergpt");
    const apiKey = config.get<string>("apiKey");
    if (apiKey) {
      this._view?.webview.postMessage({ type: "keyExists" });
    } else {
      this._view?.webview.postMessage({ type: "keyNotExists" });
    }
  }

  private async handleChats(response: any, isCommandLess: boolean) {
    let agentResponse = response;
    this._activeAgent = agentResponse["agent"];

    this._publicConversationHistory.push({
      [this._activeAgent]: {
        role: "user",
        text: agentResponse.prompt,
        agent: agentResponse.metadata.display_name,
      },
    });
    
    this._view?.webview.postMessage({ type: "showLoadingIndicator" });
    this._view?.webview.postMessage({
      type: "displayMessages",
      value: this._publicConversationHistory,
    });
    const conversationHistory = this._publicConversationHistory
      .filter((obj) => Object.keys(obj)[0] === this._activeAgent)
      .map((obj) => obj[this._activeAgent]);
    const conversationReference = conversationHistory.filter((obj) => obj.role === "model") ?? [];

    const agentName = agentResponse["agent"];
    const data = {
      agent_name: agentName.split("@")[1],
      agent_version: agentResponse["agent_version"] ?? "1.0.0",
      chat_history: conversationHistory,
      included_references: conversationReference.length > 0 ? conversationReference[conversationReference.length - 1].references : [],
      private: false,
    };
    try {
      console.log(JSON.stringify(data));
      const modelResponse = await makeHttpRequest<{ response: string, references: Array<string> }>({
        url: "https://api.commanddash.dev/v2/ai/agent/answer",
        method: "post",
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify(data),
      });
      this._publicConversationHistory.push({
        [this._activeAgent]: { role: "model", text: modelResponse.response, references: modelResponse.references },
      });
      this._view?.webview.postMessage({
        type: "displayMessages",
        value: this._publicConversationHistory,
      });
    } catch (error) {
      // this._publicConversationHistory.push({
      //   [this._activeAgent]: {
      //     role: "error",
      //     text:
      //       error instanceof Error
      //         ? (error as Error).message
      //         : (error as any).toString(),
      //   },
      // });
    } finally {
      this?._view?.webview?.postMessage({ type: "hideLoadingIndicator" });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const onboardingHtmlPath = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "onboarding",
      "onboarding.html"
    );
    const onboardingHtml = fs.readFileSync(onboardingHtmlPath.fsPath, "utf8");
    const onboardingCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "media",
        "onboarding",
        "onboarding.css"
      )
    );
    const prismCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "assets",
        "prismjs",
        "prism.min.css"
      )
    );
    const onboardingJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "media",
        "onboarding",
        "onboarding.js"
      )
    );
    const commandDeckJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "media",
        "command-deck",
        "command-deck.js"
      )
    );
    const agentUIBuilderUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "media",
        "agent-ui-builder",
        "agent-ui-builder.js"
      )
    );
    const agentProviderUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "media",
        "agent-provider",
        "agent-provider.js"
      )
    );
    const questionnaireUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "media",
        "questionnaire",
        "questionnaire.js"
      )
    );
    const headerImageUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "header.png")
    );
    // const addPhotoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "add-photo.png"));
    const loadingAnimationUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "loading-animation.json")
    );
    const outputCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "output.css")
    );

    // Modify your Content-Security-Policy
    const cspSource = webview.cspSource;

    const updatedOnboardingChatHtml = onboardingHtml
      .replace(/{{cspSource}}/g, cspSource)
      .replace(/{{onboardingCssUri}}/g, onboardingCssUri.toString())
      .replace(/{{outputCssUri}}/g, outputCssUri.toString())
      .replace(/{{onboardingJsUri}}/g, onboardingJsUri.toString())
      .replace(/{{commandDeckJsUri}}/g, commandDeckJsUri.toString())
      .replace(/{{agentUIBuilderUri}}/g, agentUIBuilderUri.toString())
      .replace(/{{agentProviderUri}}/g, agentProviderUri.toString())
      .replace(/{{questionnaireUri}}/g, questionnaireUri.toString())
      .replace(/{{headerImageUri}}/g, headerImageUri.toString())
      // .replace(/{{addPhotoUri}}/g, addPhotoUri.toString())
      .replace(/{{loadingAnimationUri}}/g, loadingAnimationUri.toString())
      .replace(/{{prismCssUri}}/g, prismCssUri.toString());

    return updatedOnboardingChatHtml;
  }

  private _getHtmlForMarketPlace(webview: vscode.Webview) {
    const marketPlaceHtmlPath = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "market-place",
      "market-place.html"
    );
    const marketPlaceHtml = fs.readFileSync(marketPlaceHtmlPath.fsPath, "utf8");
    const marketPlaceCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "media",
        "market-place",
        "market-place.css"
      )
    );
    const marketPlaceJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "media",
        "market-place",
        "market-place.js"
      )
    );
    const outputCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "output.css")
    );
    const loadingAnimationUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "loading-animation.json")
    );

    // Modify your Content-Security-Policy
    const cspSource = webview.cspSource;

    const updatedOnboardingChatHtml = marketPlaceHtml
      .replace(/{{cspSource}}/g, cspSource)
      .replace(/{{marketPlaceCssUri}}/g, marketPlaceCssUri.toString())
      .replace(/{{outputCssUri}}/g, outputCssUri.toString())
      .replace(/{{loadingAnimationUri}}/g, loadingAnimationUri.toString())
      .replace(/{{marketPlaceJsUri}}/g, marketPlaceJsUri.toString());

    return updatedOnboardingChatHtml;
  }

  private async _validateApiKey(apiKey: string) {
    try {
      await validateApiKey(apiKey);
      this._view?.webview.postMessage({
        type: "apiKeyValidation",
        value: "Gemini API Key is valid",
      });
    } catch (error) {
      console.log("gemini api error", error);
      this._view?.webview.postMessage({
        type: "apiKeyValidation",
        value: "Gemini API Key is invalid",
      });
    }
  }

  private async getResponse(prompt: string) {
    if (!this._view) {
      await vscode.commands.executeCommand("dash.chatView.focus");
    } else {
      this._view?.show?.(true);
    }

    // Initialize conversation history if it's the first time
    if (this._privateConversationHistory.length === 0) {
      this._privateConversationHistory.push(
        //TODO: Fetch and insert the available agents dynamically
        {
          role: "user",
          parts: `You are a Flutter/Dart coding assistant specializing in providing well-formatted, production-ready code. Here is what I can do with you:

                1. I can ask you to complete Flutter coding tasks by attaching multiple code snippets from different files in you inline chat by selecting the code and choosing "Attach Snippet to Dash" from the right click menu. With full context provided, you will generate accurate responses with well-formatted code snippets.
                
                2. You offer specialized agents for specific tasks. I can initialize an agent by typing "@" followed by the agent's name. Each agent has its own set of slash commands for specific tasks.

                Available agents and commands are.
                1. @ (globally commands that can be triggered without an agent)
                - /refactor
                - /documentation
                2. @workspace
                - /query
                3. @flutter
                - /doc
                4. @test
                - /unit
                - /widget
                - /integration
                
                User's can use run the agents or commands like:
                - @test /unit
                - /refactor
                - @workspace /query
                If I greet you or ask you what you can do for me, tell me about the above abilities. Be concise.`,
        },
        {
          role: "model",
          parts:
            "Noted, I will be responding as per your instructions. Let's get started.",
        }
      );
    }
    let workspacePrompt = "";

    // Add a simplified version to the public history
    this._publicConversationHistory.push({
      [this._activeAgent]: { role: "user", text: prompt },
    });

    this._view?.webview.postMessage({
      type: "displayMessages",
      value: this._publicConversationHistory,
    });
    this._view?.webview.postMessage({ type: "setPrompt", value: "" });

    // Check if the prompt includes '@workspace' and handle accordingly
    try {
      this._privateConversationHistory.push({ role: "user", parts: prompt });
      this._view?.webview.postMessage({ type: "showLoadingIndicator" });
    } catch (error) {
      console.error("Error processing workspace prompt: ", error);
      logError("workspace-prompt-error", error);
    }
    // Use the stored conversation history for the prompt
    try {
      let response = "";
      this._privateConversationHistory.push({ role: "user", parts: prompt });
      this._view?.webview.postMessage({ type: "showLoadingIndicator" });

      this._privateConversationHistory.push({ role: "model", parts: response });
      this._publicConversationHistory.push({
        [this._activeAgent]: { role: "model", text: response },
      });
      this._view?.webview.postMessage({
        type: "displayMessages",
        value: this._publicConversationHistory,
      });
      logEvent("follow-up-message", { from: "command-deck" });
      this._view?.webview.postMessage({
        type: "stepLoader",
        value: { creatingResultLoader: true },
      });
      this._view?.webview.postMessage({ type: "addResponse", value: "" });
    } catch (error) {
      console.error(error);
      logError("command-deck-conversation-error", error);
      // this._publicConversationHistory.push({
      //   [this._activeAgent]: {
      //     role: "error",
      //     text:
      //       error instanceof Error
      //         ? (error as Error).message
      //         : (error as any).toString(),
      //   },
      // });
    } finally {
      this._view?.webview.postMessage({ type: "hideLoadingIndicator" });
      this._view?.webview.postMessage({
        type: "workspaceLoader",
        value: false,
      });
    }
  }

  public setMarketPlaceWebView() {
    if (this._view) {
      this._view.webview.postMessage({ type: "cleanUpEventListener" });
      this._view.webview.html = this._getHtmlForMarketPlace(
        this._view?.webview
      );
      this.setMarketPlaceContext(true);
    }
  }

  public setChatWebView() {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view?.webview);
      this.setMarketPlaceContext(false);
    }
  }

  public clearConversationHistory() {
    delete this.chatDocuments[this._activeAgent];
    this._privateConversationHistory = [];
    this._publicConversationHistory = [];
  }
}
