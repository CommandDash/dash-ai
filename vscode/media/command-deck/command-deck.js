
const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',

    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',

    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',

    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',

    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',

    'letterSpacing',
    'wordSpacing',

    'tabSize',
    'MozTabSize',
];

function getCaretCoordinates(element, position) {
    const div = document.createElement('div');
    document.body.appendChild(div);

    const style = div.style;
    const computed = getComputedStyle(element);

    style.whiteSpace = 'pre-wrap';
    style.wordBreak = 'break-word';
    style.position = 'absolute';
    style.visibility = 'hidden';
    style.overflow = 'hidden';

    properties.forEach(prop => {
        style[prop] = computed[prop];
    });

    div.textContent = element.textContent.substring(0, position);

    const span = document.createElement('span');
    span.textContent = element.textContent.substring(position) || '.';
    div.appendChild(span);

    const coordinates = {
        top: span.offsetTop + parseInt(computed['borderTopWidth']),
        left: span.offsetLeft + parseInt(computed['borderLeftWidth']),
        // height: parseInt(computed['lineHeight'])
        height: span.offsetHeight
    };

    div.remove();

    return coordinates;
}

class CommandDeck {
    constructor(ref, menuRef, resolveFn, replaceFn, menuItemFn, agentUIBuilder) {
        this.ref = ref;
        this.menuRef = menuRef;
        this.resolveFn = resolveFn;
        this.replaceFn = replaceFn;
        this.menuItemFn = menuItemFn;
        this.options = [];
        this.agentUIBuilder = agentUIBuilder;

        this.makeOptions = this.makeOptions.bind(this);
        this.closeMenu = this.closeMenu.bind(this);
        this.selectItem = this.selectItem.bind(this);
        this.onInput = this.onInput.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.renderMenu = this.renderMenu.bind(this);

        this.ref.addEventListener('input', this.onInput);
        this.ref.addEventListener('keydown', this.onKeyDown);
    }

    async makeOptions(query) {
        let options = [];
        if (query.startsWith('@')) {
            options = await this.resolveFn(query, 'at');
        }

        if (options.length !== 0) {
            this.options = options;
            this.renderMenu();
        } else {
            this.closeMenu();
        }
    }

    closeMenu() {
        setTimeout(() => {
            this.options = [];
            this.left = undefined;
            this.top = undefined;
            this.triggerIdx = undefined;
            this.renderMenu();
        }, 0);
    }

    selectItem(active) {
        return () => {
            const option = this.options[active];
            if (!option?.name.startsWith('/')) {
                this.ref.textContent = '';
            }
            if (option?.name.startsWith('@')) {
                activeAgentAttach.style = "color: #497BEF; !important";
                
                agentName = option?.metadata.display_name;
                headerLogo.classList.add("hidden");
                headerAgentLogo.classList.remove("hidden");
                headerAgentLogo.src = option.metadata.avatar_id;
                headerText.classList.add("hidden");
                headerAgentName.classList.remove("hidden");
                headerAgentName.textContent = option?.metadata.display_name;
                headerAgentDescription.classList.remove("hidden");
                headerAgentDescription.textContent = option?.metadata.description;
                activeAgent = true;
                commandEnable = false;
                
                currentActiveAgent = option.name;
                this.closeMenu();
                // Move the cursor to the end of the word
                this.ref.focus();
                // Move the cursor to the end of the text
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(this.ref);
                range.collapse(false); // false means collapse to the end
                selection.removeAllRanges();
                selection.addRange(range);
                displayMessages();
            } else {
                this.ref.textContent = '';
                const agentUIBuilder = new AgentUIBuilder(this.ref);
                const agentProvider = new AgentProvider(data);
                agentInputsJson.push(agentProvider.getInputs(option.name, currentActiveAgent));
                agentUIBuilder.buildAgentUI();

                this.ref.focus();
                this.closeMenu();

                setTimeout(() => {
                    adjustHeight();
                    commandEnable = true;
                    // activeCommandsAttach.style = "color: rgb(236 72 153); !important";
                }, 0);
            }
        };
    }

    extractCommands(text, keyword) {
        const regex = new RegExp(`\\${keyword}\\s*(\\w+)`, 'g');
        const matches = text.match(regex);
        if (!matches) {
            return null;
        };
        return matches.map(match => {
            const [, word] = match.split(keyword);
            return word;
        });
    }

    onInput(ev) {
        const positionIndex = this.ref.selectionStart;
        const textBeforeCaret = this.ref.textContent.slice(0, positionIndex);
        const tokens = textBeforeCaret.split(/\s/);
        const lastToken = tokens[tokens.length - 1];
        const triggerIdx = textBeforeCaret.endsWith(lastToken) ? textBeforeCaret.length - lastToken.length : -1;
        const maybeTrigger = textBeforeCaret[triggerIdx];
        const keystrokeTriggered = maybeTrigger === '@' || maybeTrigger === '/';

        this.ref.style.height = "auto";
        this.ref.style.height = this.ref.scrollHeight + "px";

        // const iscoAtStartOfWord = triggerIdx === 0;

        if (!keystrokeTriggered) {
            this.closeMenu();
            return;
        }

        const query = textBeforeCaret.slice(triggerIdx);
        this.makeOptions(query);

        const coords = getCaretCoordinates(this.ref, positionIndex);
        const { top, left } = this.ref.getBoundingClientRect();

        const savedCaretPosition = positionIndex;

        setTimeout(() => {
            this.active = 0;
            this.left = window.scrollX + coords.left + left + this.ref.scrollLeft;
            this.top = window.scrollY + coords.top + top + coords.height - this.ref.scrollTop;
            this.triggerIdx = triggerIdx;

            this.renderMenu();

            this.ref.selectionStart = this.ref.selectionEnd = savedCaretPosition;
        }, 0);
    }

    onKeyDown(ev) {
        let keyCaught = false;
        if (this.triggerIdx !== undefined) {
            switch (ev.key) {
                case 'ArrowDown':
                    this.active = Math.min(this.active + 1, this.options.length - 1);
                    this.renderMenu();
                    keyCaught = true;
                    break;
                case 'ArrowUp':
                    this.active = Math.max(this.active - 1, 0);
                    this.renderMenu();
                    keyCaught = true;
                    break;
                case 'Enter':
                case 'Tab':
                    this.selectItem(this.active)();
                    keyCaught = true;
                    break;
            }
        }

        if (ev.key === "Backspace") {
            setTimeout(() => {
                if (this.ref.textContent.trim() === "") {
                    commandEnable = false;
                    // activeCommandsAttach.style = "color: var(--vscode-input-placeholderForeground); !important";
                    agentInputsJson.length = 0;
                    codeInputId = 0;
                    // activeCommandsAttach.textContent = "/";
                }
            }, 0);
        }

        if (keyCaught) {
            ev.preventDefault();
        }
    }

    renderMenu() {
        if (this.top === undefined) {
            this.menuRef.hidden = true;
            return;
        }

        const caretHeight = this.ref.offsetHeight;
        this.menuRef.style.left = this.left + 'px';
        this.menuRef.style.top = (this.top - this.menuRef.offsetHeight - caretHeight) + 'px';
        this.menuRef.innerHTML = '';
        this.menuRef.classList.add("p-1");

        this.options.forEach((option, idx) => {
            const trigger = this.ref.textContent[this.triggerIdx];
            this.menuRef.appendChild(this.menuItemFn(
                option,
                this.selectItem(idx),
                this.active === idx,
                trigger));
        });

        this.menuRef.hidden = false;
    }
}