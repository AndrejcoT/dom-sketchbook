# DOM Sketchbook

A lightweight browser-based playground for experimenting with JavaScript and DOM manipulation.

## Overview

DOM Sketchbook is a small front-end project built to practice working with the DOM in a hands-on way. It gives you a simple editor where you can write JavaScript, run it against a live `root` element, and immediately inspect the result in both a visual preview and generated HTML view.

## Features

- Write JavaScript directly in the browser
- Run code with the **Run** button
- Use **Ctrl + Enter** / **Cmd + Enter** as a shortcut to run code
- See output rendered in a live preview panel
- Inspect the generated HTML structure in a dedicated HTML tab
- View `console.log()` output in the built-in console panel
- View runtime errors in the console panel
- Run code inside a **sandboxed iframe** for safer execution
- Automatically save the last written code in `localStorage`

## How It Works

The app uses a simple split layout:

- **Left side:** code editor (`textarea`)
- **Right side:** preview panel or generated HTML
- **Bottom:** console output and error messages

When you run code:

1. Your JavaScript is read from the editor
2. It is sent to a sandboxed iframe
3. The code runs with access to a `root` element
4. Any DOM changes are rendered in the preview
5. The resulting HTML is sent back and formatted in the HTML tab
6. Any `console.log()` messages or runtime errors are displayed in the console area

## Example Usage

Inside the editor, you can write code like this:

```js
const card = document.createElement('div');
card.textContent = 'Hello from DOM Sketchbook';
card.style.padding = '12px';
card.style.border = '1px solid white';
root.appendChild(card);
console.log('Element rendered successfully');
```

This will:
- render a new element inside the preview
- show the generated HTML in the HTML tab
- print a message to the built-in console

## Tech Stack

- **HTML**
- **CSS**
- **Vanilla JavaScript**
- **Iframe sandboxing** for isolated execution
- **localStorage** for saving editor content

## Project Structure

```text
DOM-Sketchbook/
│── index.html
│── style.css
│── script.js
│── README.md
```

## File Breakdown

### `index.html`
Defines the app layout:
- header with action buttons
- editor area
- preview / HTML output area
- console section

### `style.css`
Handles the visual layout and styling of the interface.

### `script.js`
Contains the core logic for:
- running user code
- switching between Preview and HTML tabs
- formatting generated HTML
- mirroring console logs and errors
- communicating with the sandboxed iframe
- saving editor content to `localStorage`

## Installation / Running Locally

Clone the repository:

```bash
git clone https://github.com/AndrejcoT/dom-sketchbook.git
cd dom-sketchbook
```

Then open `index.html` in your browser.

Or visit

https://dom-sketchbook.vercel.app/

## Current Limitations

This project is intentionally simple and focused on learning, so a few limitations still exist:

- only JavaScript execution is supported in the editor
- styling must be added manually through JavaScript
- no separate CSS or HTML editor yet
- no syntax highlighting
- no export or sharing functionality

## Future Improvements

Possible next upgrades:

- add separate HTML, CSS, and JS editors
- add syntax highlighting
- improve responsive design
- add reset / clear editor button
- add example snippets users can load quickly
- support saving multiple sketches
- improve console formatting for objects and arrays
