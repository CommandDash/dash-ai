<p align="center">
  <a href="" rel="noopener">
 <img height=200px src="https://raw.githubusercontent.com/Welltested-AI/fluttergpt/feature/pebble/media/icon.png" alt="Flutter-logo"></a>
</p>
<h1 align="center">FlutterGPT</h1>
<div align="center">

[![VScode Downloads](https://img.shields.io/visual-studio-marketplace/d/WelltestedAI.fluttergpt)](https://marketplace.visualstudio.com/items?itemName=WelltestedAI.fluttergpt&ssr=false#overview)
[![VScode version](https://img.shields.io/visual-studio-marketplace/v/WelltestedAI.fluttergpt)](https://marketplace.visualstudio.com/items?itemName=WelltestedAI.fluttergpt&ssr=false#overview)
[![License: APACHE](https://img.shields.io/badge/License-APACHE%202.0-yellow)](/LICENSE)

<h4> Your Flutter AI Copilot powered with Gemini Code & Vision.</h4>
</div>

-----------------
FlutterGPT is an open-source coding assistant specifically designed for Flutter Engineers. The assistant allows you to chat with Gemini inside VSCODE and create, refactor and debug code. 

###### ✨ Powered by Gemini 
###### 🤝 Dart Analyzer Inside
###### 👨🏼‍💻 For and by Flutter Engineers

Our vision is to make Flutter development faster and developer centric by automating low-level workflows that we as developers work on a daily basis.

-----------------
## Getting Started

##### 1. Create Free Gemini API Key
Visit [Makersuite by Google](https://makersuite.google.com/), sign in with you google account and create your free API Key.
##### 2. Add the key to FlutterGPT
After installing the extensions, please visit your VSCode setttings, search for `fluttergpt.apiKey` and paste the Gemini API Key.
##### 3. Run your first command.
To get started, right-click on your editor in a dart project. Checkout all features below. 🔽

## Features

### 🪄 Create

<img src="https://raw.githubusercontent.com/Welltested-AI/fluttergpt/main/media/create.png" alt="Creating Code using FlutterGPT" width="500"/>

#### 1. **Widget from Description**

Create flutter widgets based on the description you provide. Be as specific as you like.

`FlutterGPT Create: Widget from Description`

#### 2. **Model Class from JSON**

Create model classes from JSON with null safety in mind. You can also choose to generate Freezed or JsonSerializable modules

command: `FlutterGPT Create: Model Class from JSON`

#### 3. **Repository Class from Postman Json**

Convert you postman collection exports json to API repository class

command: `FlutterGPT Create: API Repository from Postman JSON`

#### 4. **Complete Code from BluePrint**

Get complete code from a blueprint of a class or function with the behaviour of functions, state management and architecture of your choice.

command: `FlutterGPT Create: Code from Blueprint`

#### 5. **Create Web and Tablet Counterparts**

Create Web and Tablet widgets from mobile code. Write the mobile code and let the AI do the rest. i.e create the tablet and web code.

command: `FlutterGPT Create: Web and Tablet Counterparts`

#### 6. **Create Mobile, Web and Tablet Counterpart from description**

Create Mobile, Web and Tablet widgets from description. Select a folder and write the description. The AI will create the code for you. i.e. create the mobile, tablet and web code and a selector file to choose the right code.

command: `FlutterGPT Create: Mobile, Web and Tablet Widget From Description`

### 🛠️ Refactor

<p align="center">
<img src="https://raw.githubusercontent.com/Welltested-AI/fluttergpt/main/media/refactor.png" alt="Refactoring Code using FlutterGPT" width="500"/>
</p>

#### 1. **From Instruction**

Refactor widgets and logic both with this command.

command: `FlutterGPT Refactor: From Instructions`

#### 2. **Fix Errors**

Pass your runtime errors and get fixed code back.

command: `FlutterGPT Refactor: Fix Errors`


### 📝 Add to Reference

LLM's work great when provided with references along with the instructions. FlutterGPT users can now add any piece of code or customized descriptions as reference and they'll be passed to model for any command being used.

**Practical usecases:**

1. Having widgets follow a state management and use a view model already defined in your code.

2. Use snippets as a reference while refactoring large part of projects to use the same style and structure.

3. In, `codeFromBluePrint` to generate full-fledged classes taking state management, architecture and style as reference from an existing class.

## FAQs

1. **How safe and secure is it to use, and can you explain why?**
- FlutterGPT is powered by Google's  Gemini Models and is secure to use for personal usage or work - [Safety and Security Guidelines](https://blog.google/technology/ai/google-gemini-ai/#responsibility-safety)

2. **Do I need to pay to use FlutterGPT?**

Gemini PRO is currently in early access and is completely free to use for upto 60 requests for minute. Please check the [pricing](https://ai.google.dev/pricing) here.

3. **I am an Android Studio user. Can I use FlutterGPT?**
- FlutterGPT is available for IntelliJ-based IDEs and can be downloaded from the plugin marketplace. Please follow this link: [https://plugins.jetbrains.com/plugin/21568-fluttergpt]



## Contributing

FlutterGPT 💙 community centric and any contribution is most welcome to make it useful for you!

### Ways to contribute

- **File feature requests**: Sugggest new features that'll make your development process easier. File at [Issues Board](https://github.com/Welltested-AI/fluttergpt/issues).
- **Fix existing issues**: Help us by fixing existing issues in our [issues board](https://github.com/Welltested-AI/fluttergpt/issues).
- **Pick up approved features**: You can also contribute by picking up approved features from our [Roadmap](ROADMAP.md).


To contribute, please follow the guidelines in our [CONTRIBUTING.md](CONTRIBUTING.md) file. You can also reach out to us at `team@welltested.ai` if you have any questions or feedback.

## Running Locally for Contribution
 1. Clone the repository.
 2. Run `npm install`
 3. Use the `Run Extension` command from launch.json for running the extension.
 4. Ensure you've specified the Gemini API key in the settings.

## Roadmap

To get a sense of direction of where we're heading, please check out our [Roadmap](ROADMAP.md).

## Known Issues

This is the beta version and can be unstable. Please check our [issues board](https://github.com/Welltested-AI/fluttergpt/issues) for any known issues.


## Release Notes: 0.1.0 
- This is the first pre-release powered by Gemini.
- Built in Dart analyzer to assist extracting and inserting code.
- Support for basic create, refactor and debug operations.

## License

FlutterGPT is released under the Apache License Version 2.0. See the [LICENSE](LICENSE) file for more information.