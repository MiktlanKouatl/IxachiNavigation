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
                
                <h3>Screens</h3>
                <div id="screen-list"></div>
                
                <hr style="border-color: #333; margin: 15px 0;">
                
                <h3>Elements</h3>
                <button id="btn-add-text">+ Text</button>
                <button id="btn-add-model">+ Model</button>
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
            div.textContent = screen.id;
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
            div.textContent = `${element.id} (${element.type})`;
            div.onclick = () => this.store.selectElement(element.id);
            list.appendChild(div);
        });
    }

    private renderInspector(): void {
        const container = this.container.querySelector('#inspector-content')!;
        const element = this.store.getCurrentElement();

        if (!element) {
            container.innerHTML = '<p style="color: #666; font-style: italic;">Select an element to edit</p>';
            return;
        }

        container.innerHTML = '';

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

        // --- ID Section ---
        createInput('ID', element.id, 'text', (val) => { /* Read only */ });

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
        }
    }
}
