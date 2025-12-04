import { SectionEditorStore } from '../SectionEditorStore';
import { SectionSerializer } from '../SectionSerializer';
import { PreviewViewport } from '../components/PreviewViewport';

export class SectionCreatorUI {
    private container: HTMLElement;
    private store: SectionEditorStore;
    private viewport: PreviewViewport | null = null;

    constructor() {
        this.store = SectionEditorStore.getInstance();
        this.container = document.createElement('div');
        this.container.id = 'section-creator-root';
        this.injectStyles();
        this.buildLayout();
        this.bindEvents();

    }

    public mount(parent: HTMLElement): void {
        parent.appendChild(this.container);

        // Initialize Viewport after mounting to ensure dimensions are correct
        const viewportContainer = this.container.querySelector('#sc-viewport') as HTMLElement;
        if (viewportContainer && !this.viewport) {
            this.viewport = new PreviewViewport(viewportContainer);
        }
    }

    private injectStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            #section-creator-root {
                position: absolute;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: #1a1a1a;
                color: #eee;
                font-family: 'Inter', sans-serif;
                display: grid;
                grid-template-columns: 250px 1fr 300px;
                grid-template-rows: 1fr 200px;
                grid-template-areas: 
                    "sidebar viewport inspector"
                    "sidebar timeline inspector";
                z-index: 1000;
                overflow: hidden;
            }

            .sc-panel {
                background: #222;
                border: 1px solid #333;
                padding: 10px;
                overflow-y: auto;
            }

            #sc-sidebar { grid-area: sidebar; border-right: 1px solid #444; }
            #sc-viewport { grid-area: viewport; background: #000; position: relative; }
            #sc-inspector { grid-area: inspector; border-left: 1px solid #444; }
            #sc-timeline { grid-area: timeline; border-top: 1px solid #444; background: #1e1e1e; }

            h2, h3 { margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #888; }
            
            button {
                background: #444;
                color: white;
                border: none;
                padding: 5px 10px;
                cursor: pointer;
                border-radius: 4px;
                margin-bottom: 5px;
                font-size: 12px;
            }
            button:hover { background: #555; }
            
            .sc-list-item {
                padding: 8px;
                background: #2a2a2a;
                margin-bottom: 4px;
                cursor: pointer;
                border-radius: 4px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .sc-list-item:hover { background: #333; }
            .sc-list-item.active { background: #0066cc; }

            input[type="text"], input[type="number"] {
                background: #111;
                border: 1px solid #444;
                color: white;
                padding: 4px;
                width: 100%;
                box-sizing: border-box;
                margin-bottom: 8px;
            }

            .form-group { margin-bottom: 10px; }
            label { display: block; font-size: 11px; color: #aaa; margin-bottom: 2px; }
        `;
        document.head.appendChild(style);
    }

    private buildLayout(): void {
        this.container.innerHTML = `
            <div id="sc-sidebar" class="sc-panel">
                <h2>Sections</h2>
                <div class="toolbar">
                    <button id="btn-new-section">New Section</button>
                    <button id="btn-import-json">Import JSON</button>
                </div>
                <div id="section-list"></div>
                
                <hr style="border-color: #333; margin: 15px 0;">
                
                <hr style="border-color: #333; margin: 15px 0;">
                
                <h3>Screens</h3>
                <button id="btn-new-screen">New Screen</button>
                <div id="screen-list"></div>
                
                <hr style="border-color: #333; margin: 15px 0;">
                
                <h3>Elements</h3>
                <button id="btn-add-text">+ Text</button>
                <button id="btn-add-model">+ Model</button>
                <button id="btn-add-image">+ Image</button>
                <button id="btn-add-video">+ Video</button>
                <button id="btn-add-button">+ Button</button>
                <div id="element-list"></div>
            </div>
            
            <div id="sc-viewport">
                <!-- Three.js Canvas will go here -->
            </div>
            
            <div id="sc-inspector" class="sc-panel">
                <h2>Inspector</h2>
                <div id="inspector-content">
                    <p style="color: #666; font-style: italic;">Select an element to edit</p>
                </div>
            </div>
            
            <div id="sc-timeline" class="sc-panel">
                <h2>Timeline</h2>
                <!-- Timeline controls -->
            </div>
        `;
    }

    private bindEvents(): void {
        // Bind UI buttons to Store actions
        this.container.querySelector('#btn-new-section')?.addEventListener('click', () => {
            const id = prompt('Enter Section ID:', 'new_section');
            if (id) this.store.createSection(id);
        });

        this.container.querySelector('#btn-import-json')?.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e: any) => {
                if (e.target.files.length > 0) {
                    const section = await SectionSerializer.uploadJSON(e.target.files[0]);
                    this.store.loadSection(section);
                }
            };
            input.click();
        });

        this.container.querySelector('#btn-new-screen')?.addEventListener('click', () => {
            if (!this.store.getCurrentSection()) {
                alert('Please select a section first');
                return;
            }
            const id = prompt('Enter Screen ID:', `screen_${Date.now()}`);
            if (id) this.store.createScreen(id);
        });

        this.container.querySelector('#btn-add-text')?.addEventListener('click', () => {
            if (!this.store.getCurrentScreen()) {
                alert('Please select a screen first');
                return;
            }
            const id = `text_${Date.now()}`;
            this.store.addElementToCurrentScreen({
                id,
                type: 'text',
                content: 'New Text',
                transform: {
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: 1, y: 1, z: 1 }
                },
                style: {
                    color: '#ffffff',
                    fontSize: 1,
                    opacity: 1
                }
            });
        });

        this.container.querySelector('#btn-add-model')?.addEventListener('click', () => {
            if (!this.store.getCurrentScreen()) {
                alert('Please select a screen first');
                return;
            }
            const id = `model_${Date.now()}`;
            this.store.addElementToCurrentScreen({
                id,
                type: 'model',
                url: 'assets/models/default.glb', // Placeholder
                transform: {
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: 1, y: 1, z: 1 }
                },
                style: {
                    opacity: 1
                }
            });
        });

        this.container.querySelector('#btn-add-image')?.addEventListener('click', () => {
            if (!this.store.getCurrentScreen()) {
                alert('Please select a screen first');
                return;
            }
            const id = `image_${Date.now()}`;
            this.store.addElementToCurrentScreen({
                id,
                type: 'image',
                url: 'assets/images/placeholder.png', // Placeholder
                transform: {
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: 1, y: 1, z: 1 }
                },
                style: {
                    opacity: 1
                }
            });
        });

        this.container.querySelector('#btn-add-video')?.addEventListener('click', () => {
            if (!this.store.getCurrentScreen()) {
                alert('Please select a screen first');
                return;
            }
            const id = `video_${Date.now()}`;
            this.store.addElementToCurrentScreen({
                id,
                type: 'video',
                url: 'assets/videos/placeholder.mp4', // Placeholder
                transform: {
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: 1, y: 1, z: 1 }
                },
                style: {
                    opacity: 1
                }
            });
        });

        this.container.querySelector('#btn-add-button')?.addEventListener('click', () => {
            if (!this.store.getCurrentScreen()) {
                alert('Please select a screen first');
                return;
            }
            const id = `btn_${Date.now()}`;
            this.store.addElementToCurrentScreen({
                id,
                type: 'button',
                transform: {
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: 1, y: 1, z: 1 }
                },
                style: {
                    color: '#00ff00',
                    opacity: 0.5
                },
                interaction: {
                    trigger: 'click',
                    action: 'goto-next-screen'
                }
            });
        });

        // Listen for store updates to refresh UI
        this.store.on('sectionsUpdated', () => this.renderSectionList());
        this.store.on('selectionChanged', () => {
            this.renderSectionList(); // To update active state
            this.renderScreenList();
            this.renderElementList();
            this.renderInspector();
        });
        this.store.on('sectionUpdated', () => {
            this.renderElementList();
            // Also update inspector if needed
        });
    }

    private renderSectionList(): void {
        const list = this.container.querySelector('#section-list')!;
        list.innerHTML = '';
        this.store.getSections().forEach(section => {
            const div = document.createElement('div');
            div.className = `sc-list-item ${this.store.getCurrentSection()?.id === section.id ? 'active' : ''}`;
            div.textContent = section.id;
            div.onclick = () => this.store.selectSection(section.id);

            // Download Button
            const btn = document.createElement('button');
            btn.textContent = '⬇';
            btn.style.marginLeft = '10px';
            btn.style.padding = '2px 5px';
            btn.onclick = (e) => {
                e.stopPropagation();
                SectionSerializer.downloadJSON(section);
            };
            div.appendChild(btn);

            list.appendChild(div);
        });
    }

    private renderScreenList(): void {
        const list = this.container.querySelector('#screen-list')!;
        list.innerHTML = '';
        const section = this.store.getCurrentSection();
        if (!section) return;

        section.screens.forEach(screen => {
            const div = document.createElement('div');
            div.className = `sc-list-item ${this.store.getCurrentScreen()?.id === screen.id ? 'active' : ''}`;

            const span = document.createElement('span');
            span.textContent = screen.id;
            div.appendChild(span);

            const delBtn = document.createElement('button');
            delBtn.textContent = 'X';
            delBtn.style.marginLeft = 'auto';
            delBtn.style.background = '#cc0000';
            delBtn.style.padding = '2px 6px';
            delBtn.style.fontSize = '10px';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('Delete screen?')) {
                    this.store.deleteScreen(screen.id);
                }
            };
            div.appendChild(delBtn);

            div.onclick = () => this.store.selectScreen(screen.id);
            list.appendChild(div);
        });
    }

    private renderElementList(): void {
        const list = this.container.querySelector('#element-list')!;
        list.innerHTML = '';
        const screen = this.store.getCurrentScreen();
        if (!screen) return;

        screen.elements.forEach(element => {
            const div = document.createElement('div');
            div.className = `sc-list-item ${this.store.getCurrentElement()?.id === element.id ? 'active' : ''}`;

            const span = document.createElement('span');
            span.textContent = `${element.id} (${element.type})`;
            div.appendChild(span);

            const delBtn = document.createElement('button');
            delBtn.textContent = 'X';
            delBtn.style.marginLeft = 'auto';
            delBtn.style.background = '#cc0000';
            delBtn.style.padding = '2px 6px';
            delBtn.style.fontSize = '10px';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('Delete element?')) {
                    this.store.deleteElement(element.id);
                }
            };
            div.appendChild(delBtn);

            div.onclick = () => this.store.selectElement(element.id);
            list.appendChild(div);
        });
    }

    private renderInspector(): void {
        const container = this.container.querySelector('#inspector-content')!;
        container.innerHTML = '';

        const element = this.store.getCurrentElement();
        const screen = this.store.getCurrentScreen();

        // --- Helper Functions ---
        const createInput = (label: string, value: any, type: 'text' | 'number' | 'color' | 'range', onChange: (val: any) => void, options?: { min?: number, max?: number, step?: number }) => {
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = `<label>${label}</label>`;
            const input = document.createElement('input');
            input.type = type;
            input.value = value;
            if (type === 'number') input.step = '0.1';
            if (options) {
                if (options.min !== undefined) input.min = options.min.toString();
                if (options.max !== undefined) input.max = options.max.toString();
                if (options.step !== undefined) input.step = options.step.toString();
            }
            input.onchange = (e: any) => onChange(type === 'number' || type === 'range' ? parseFloat(e.target.value) : e.target.value);
            group.appendChild(input);
            container.appendChild(group);
        };

        const createAccordion = (title: string, contentBuilder: (contentDiv: HTMLElement) => void) => {
            const details = document.createElement('details');
            details.open = true;
            details.style.marginBottom = '10px';
            details.style.border = '1px solid #333';
            details.style.borderRadius = '4px';

            const summary = document.createElement('summary');
            summary.textContent = title;
            summary.style.padding = '8px';
            summary.style.background = '#2a2a2a';
            summary.style.cursor = 'pointer';
            summary.style.fontSize = '12px';
            summary.style.fontWeight = 'bold';
            summary.style.color = '#ccc';

            const content = document.createElement('div');
            content.style.padding = '10px';

            contentBuilder(content);

            details.appendChild(summary);
            details.appendChild(content);
            container.appendChild(details);
        };

        if (!element) {
            if (screen) {
                const title = document.createElement('h3');
                title.textContent = `Screen: ${screen.id}`;
                container.appendChild(title);

                // Helper for Transition Editor
                const createTransitionEditor = (label: string, transition: any, onChange: (newTransition: any) => void) => {
                    // Safety check
                    if (!transition) {
                        transition = { type: 'none', duration: 0.5, easing: 'power2.inOut', fade: false, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };
                    }

                    createAccordion(label, (content) => {
                        // Preset (Type)
                        const typeGroup = document.createElement('div');
                        typeGroup.innerHTML = '<label>Preset</label>';
                        const typeSelect = document.createElement('select');
                        typeSelect.style.width = '100%';
                        typeSelect.style.background = '#111';
                        typeSelect.style.color = '#eee';
                        ['none', 'fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'zoom-in', 'zoom-out', 'custom'].forEach(t => {
                            const opt = document.createElement('option');
                            opt.value = t;
                            opt.textContent = t;
                            opt.selected = transition.type === t;
                            typeSelect.appendChild(opt);
                        });
                        typeSelect.onchange = (e: any) => {
                            const newType = e.target.value;
                            let updates: any = { type: newType };

                            // Apply preset values
                            if (newType === 'fade') { updates.fade = true; updates.position = { x: 0, y: 0, z: 0 }; updates.rotation = { x: 0, y: 0, z: 0 }; }
                            else if (newType === 'slide-up') { updates.fade = true; updates.position = { x: 0, y: -5, z: 0 }; }
                            else if (newType === 'slide-down') { updates.fade = true; updates.position = { x: 0, y: 5, z: 0 }; }
                            else if (newType === 'slide-left') { updates.fade = true; updates.position = { x: -5, y: 0, z: 0 }; }
                            else if (newType === 'slide-right') { updates.fade = true; updates.position = { x: 5, y: 0, z: 0 }; }
                            else if (newType === 'zoom-in') { updates.fade = true; updates.scale = { x: 0, y: 0, z: 0 }; }
                            else if (newType === 'zoom-out') { updates.fade = true; updates.scale = { x: 2, y: 2, z: 2 }; } // Example
                            else if (newType === 'none') { updates.fade = false; updates.position = { x: 0, y: 0, z: 0 }; updates.rotation = { x: 0, y: 0, z: 0 }; updates.scale = { x: 1, y: 1, z: 1 }; }

                            onChange({ ...transition, ...updates });
                        };
                        typeGroup.appendChild(typeSelect);
                        content.appendChild(typeGroup);

                        // Duration
                        createInput('Duration (s)', transition.duration || 0.5, 'number', (_) => onChange({ ...transition, duration: _ }));

                        // Composable Properties
                        const propsDetails = document.createElement('details');
                        propsDetails.open = true;
                        propsDetails.innerHTML = '<summary style="cursor:pointer; color:#aaa; font-size:11px; margin:5px 0;">Properties</summary>';
                        content.appendChild(propsDetails);

                        // Fade Checkbox
                        const fadeGroup = document.createElement('div');
                        fadeGroup.style.display = 'flex';
                        fadeGroup.style.alignItems = 'center';
                        fadeGroup.style.marginBottom = '5px';
                        const fadeCheck = document.createElement('input');
                        fadeCheck.type = 'checkbox';
                        fadeCheck.checked = !!transition.fade;
                        fadeCheck.onchange = (e: any) => onChange({ ...transition, fade: e.target.checked, type: 'custom' });
                        fadeGroup.appendChild(fadeCheck);
                        const fadeLabel = document.createElement('span');
                        fadeLabel.textContent = ' Fade Opacity';
                        fadeLabel.style.fontSize = '11px';
                        fadeLabel.style.marginLeft = '5px';
                        fadeGroup.appendChild(fadeLabel);
                        propsDetails.appendChild(fadeGroup);

                        // Position Offset
                        const posDiv = document.createElement('div');
                        posDiv.innerHTML = '<label>Position Offset (Start for In, End for Out)</label>';
                        propsDetails.appendChild(posDiv);
                        // Reuse createVec3 logic if possible, or inline it
                        const createVec3 = (vec: { x: number, y: number, z: number }, update: (k: 'x' | 'y' | 'z', v: number) => void) => {
                            const flex = document.createElement('div');
                            flex.style.display = 'flex';
                            flex.style.gap = '5px';
                            flex.style.marginBottom = '5px';
                            ['x', 'y', 'z'].forEach(axis => {
                                const input = document.createElement('input');
                                input.type = 'number';
                                input.step = '0.1';
                                input.value = (vec as any)[axis];
                                input.style.width = '100%';
                                input.style.background = '#111';
                                input.style.border = '1px solid #444';
                                input.style.color = '#eee';
                                input.onchange = (e: any) => update(axis as any, parseFloat(e.target.value));
                                flex.appendChild(input);
                            });
                            return flex;
                        };

                        propsDetails.appendChild(createVec3(transition.position || { x: 0, y: 0, z: 0 }, (axis, val) => {
                            const newPos = { ...(transition.position || { x: 0, y: 0, z: 0 }), [axis]: val };
                            onChange({ ...transition, position: newPos, type: 'custom' });
                        }));

                        // Rotation Offset
                        const rotDiv = document.createElement('div');
                        rotDiv.innerHTML = '<label>Rotation Offset (deg)</label>';
                        propsDetails.appendChild(rotDiv);
                        propsDetails.appendChild(createVec3(transition.rotation || { x: 0, y: 0, z: 0 }, (axis, val) => {
                            const newRot = { ...(transition.rotation || { x: 0, y: 0, z: 0 }), [axis]: val };
                            onChange({ ...transition, rotation: newRot, type: 'custom' });
                        }));
                    });
                };

                createTransitionEditor('Enter Transition', screen.enterTransition, (newTrans) => {
                    this.store.updateScreen(screen.id, { enterTransition: newTrans });
                });

                createTransitionEditor('Exit Transition', screen.exitTransition, (newTrans) => {
                    this.store.updateScreen(screen.id, { exitTransition: newTrans });
                });
            } else {
                container.innerHTML = '<p style="color: #666; font-style: italic;">Select an element or screen to edit</p>';
            }
            return;
        }

        // --- ID Section ---
        createInput('ID', element.id, 'text', (_) => { /* Read only */ });

        // --- Transform Section ---
        if (element.transform) {
            createAccordion('Transform', (content) => {
                // Helper for vector3 inputs
                const createVec3 = (label: string, vec: { x: number, y: number, z: number }, update: (k: 'x' | 'y' | 'z', v: number) => void) => {
                    const row = document.createElement('div');
                    row.style.marginBottom = '8px';
                    row.innerHTML = `<label style="margin-bottom:4px; color:#888;">${label}</label>`;
                    const flex = document.createElement('div');
                    flex.style.display = 'flex';
                    flex.style.gap = '5px';

                    ['x', 'y', 'z'].forEach(axis => {
                        const wrap = document.createElement('div');
                        wrap.style.flex = '1';
                        const input = document.createElement('input');
                        input.type = 'number';
                        input.step = '0.1';
                        input.value = (vec as any)[axis];
                        input.style.width = '100%';
                        input.style.background = '#111';
                        input.style.border = '1px solid #444';
                        input.style.color = '#eee';
                        input.style.padding = '2px';
                        input.onchange = (e: any) => update(axis as any, parseFloat(e.target.value));
                        wrap.appendChild(input);
                        flex.appendChild(wrap);
                    });
                    row.appendChild(flex);
                    content.appendChild(row);
                };

                createVec3('Position', element.transform!.position, (axis, val) =>
                    this.store.updateElement(element.id, { transform: { ...element.transform!, position: { ...element.transform!.position, [axis]: val } } }));

                createVec3('Rotation', element.transform!.rotation, (axis, val) =>
                    this.store.updateElement(element.id, { transform: { ...element.transform!, rotation: { ...element.transform!.rotation, [axis]: val } } }));

                createVec3('Scale', element.transform!.scale, (axis, val) =>
                    this.store.updateElement(element.id, { transform: { ...element.transform!, scale: { ...element.transform!.scale, [axis]: val } } }));
            });
        }

        // --- Style Section ---
        createAccordion('Style', (content) => {
            // Color
            const colorGroup = document.createElement('div');
            colorGroup.className = 'form-group';
            colorGroup.innerHTML = '<label>Color</label>';
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = element.style?.color || '#ffffff';
            colorInput.style.width = '100%';
            colorInput.style.height = '30px';
            colorInput.style.border = 'none';
            colorInput.style.padding = '0';
            colorInput.onchange = (e: any) => this.store.updateElement(element.id, { style: { ...(element.style || {}), color: e.target.value } });
            colorGroup.appendChild(colorInput);
            content.appendChild(colorGroup);

            // Opacity
            const opacityGroup = document.createElement('div');
            opacityGroup.className = 'form-group';
            opacityGroup.innerHTML = `<label>Opacity: ${element.style?.opacity ?? 1}</label>`;
            const opacityInput = document.createElement('input');
            opacityInput.type = 'range';
            opacityInput.min = '0';
            opacityInput.max = '1';
            opacityInput.step = '0.1';
            opacityInput.value = (element.style?.opacity ?? 1).toString();
            opacityInput.oninput = (e: any) => {
                const val = parseFloat(e.target.value);
                opacityGroup.querySelector('label')!.textContent = `Opacity: ${val}`;
                this.store.updateElement(element.id, { style: { ...(element.style || {}), opacity: val } });
            };
            opacityGroup.appendChild(opacityInput);
            content.appendChild(opacityGroup);

            // Font Size (Text only)
            if (element.type === 'text') {
                const fsGroup = document.createElement('div');
                fsGroup.className = 'form-group';
                fsGroup.innerHTML = '<label>Font Size</label>';
                const fsInput = document.createElement('input');
                fsInput.type = 'number';
                fsInput.step = '0.1';
                fsInput.value = element.style?.fontSize || 2;
                fsInput.style.width = '100%';
                fsInput.style.background = '#111';
                fsInput.style.border = '1px solid #444';
                fsInput.style.color = '#eee';
                fsInput.onchange = (e: any) => this.store.updateElement(element.id, { style: { ...(element.style || {}), fontSize: parseFloat(e.target.value) } });
                fsGroup.appendChild(fsInput);
                content.appendChild(fsGroup);
            }
        });

        // --- Content Section ---
        if (element.type === 'text') {
            createAccordion('Content', (content) => {
                const group = document.createElement('div');
                group.className = 'form-group';
                group.innerHTML = '<label>Text</label>';
                const input = document.createElement('textarea');
                input.value = element.content || '';
                input.style.width = '100%';
                input.style.height = '60px';
                input.style.background = '#111';
                input.style.border = '1px solid #444';
                input.style.color = '#eee';
                input.onchange = (e: any) => this.store.updateElement(element.id, { content: e.target.value });
                group.appendChild(input);
                content.appendChild(group);
            });
        } else if (element.type === 'image' || element.type === 'model' || element.type === 'video') {
            createAccordion('Source', (content) => {
                const group = document.createElement('div');
                group.className = 'form-group';
                group.innerHTML = '<label>URL</label>';
                const input = document.createElement('input');
                input.type = 'text';
                input.value = element.url || '';
                input.style.width = '100%';
                input.onchange = (e: any) => this.store.updateElement(element.id, { url: e.target.value });
                group.appendChild(input);
                content.appendChild(group);
            });
        }

        // --- Interaction Section (All Elements) ---
        createAccordion('Interaction', (content) => {
            // Trigger
            const triggerGroup = document.createElement('div');
            triggerGroup.className = 'form-group';
            triggerGroup.innerHTML = '<label>Trigger</label>';
            const triggerSelect = document.createElement('select');
            triggerSelect.style.width = '100%';
            triggerSelect.style.background = '#111';
            triggerSelect.style.color = '#eee';
            ['none', 'click', 'hover'].forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t;
                opt.selected = element.interaction?.trigger === t || (t === 'none' && !element.interaction);
                triggerSelect.appendChild(opt);
            });
            triggerSelect.onchange = (e: any) => {
                const val = e.target.value;
                if (val === 'none') {
                    this.store.updateElement(element.id, { interaction: undefined });
                } else {
                    this.store.updateElement(element.id, {
                        interaction: {
                            trigger: val,
                            action: element.interaction?.action || 'goto-next-screen',
                            payload: element.interaction?.payload
                        }
                    });
                }
                this.renderInspector(); // Re-render to show/hide action fields
            };
            triggerGroup.appendChild(triggerSelect);
            content.appendChild(triggerGroup);

            if (element.interaction) {
                // Action
                const actionGroup = document.createElement('div');
                actionGroup.className = 'form-group';
                actionGroup.innerHTML = '<label>Action</label>';
                const actionSelect = document.createElement('select');
                actionSelect.style.width = '100%';
                actionSelect.style.background = '#111';
                actionSelect.style.color = '#eee';
                ['goto-next-screen', 'goto-screen', 'run-custom-function'].forEach(a => {
                    const opt = document.createElement('option');
                    opt.value = a;
                    opt.textContent = a;
                    opt.selected = element.interaction?.action === a;
                    actionSelect.appendChild(opt);
                });
                actionSelect.onchange = (e: any) => {
                    this.store.updateElement(element.id, {
                        interaction: { ...element.interaction!, action: e.target.value }
                    });
                    this.renderInspector(); // Re-render for payload change
                };
                actionGroup.appendChild(actionSelect);
                content.appendChild(actionGroup);

                // Payload
                const payloadGroup = document.createElement('div');
                payloadGroup.className = 'form-group';

                if (element.interaction.action === 'goto-screen') {
                    payloadGroup.innerHTML = '<label>Target Screen</label>';
                    const screenSelect = document.createElement('select');
                    screenSelect.style.width = '100%';
                    screenSelect.style.background = '#111';
                    screenSelect.style.color = '#eee';

                    const currentSection = this.store.getCurrentSection();
                    if (currentSection) {
                        currentSection.screens.forEach(s => {
                            const opt = document.createElement('option');
                            opt.value = s.id;
                            opt.textContent = s.id;
                            opt.selected = element.interaction?.payload === s.id;
                            screenSelect.appendChild(opt);
                        });
                    }

                    screenSelect.onchange = (e: any) => {
                        this.store.updateElement(element.id, {
                            interaction: { ...element.interaction!, payload: e.target.value }
                        });
                    };
                    payloadGroup.appendChild(screenSelect);
                } else {
                    payloadGroup.innerHTML = '<label>Payload (Target ID)</label>';
                    const payloadInput = document.createElement('input');
                    payloadInput.type = 'text';
                    payloadInput.value = element.interaction?.payload || '';
                    payloadInput.style.width = '100%';
                    payloadInput.onchange = (e: any) => {
                        this.store.updateElement(element.id, {
                            interaction: { ...element.interaction!, payload: e.target.value }
                        });
                    };
                    payloadGroup.appendChild(payloadInput);
                }

                content.appendChild(payloadGroup);
            }
        });
    }
}
