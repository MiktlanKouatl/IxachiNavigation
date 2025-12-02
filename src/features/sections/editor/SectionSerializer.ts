import { SectionData } from '../types/SectionData';

export class SectionSerializer {
    public static toJSON(section: SectionData): string {
        return JSON.stringify(section, null, 2);
    }

    public static fromJSON(json: string): SectionData {
        try {
            const data = JSON.parse(json) as SectionData;
            // Basic validation
            if (!data.id || !data.screens) {
                throw new Error('Invalid SectionData JSON');
            }
            return data;
        } catch (e) {
            console.error('Failed to parse Section JSON', e);
            throw e;
        }
    }

    public static downloadJSON(section: SectionData): void {
        const json = this.toJSON(section);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${section.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    public static async uploadJSON(file: File): Promise<SectionData> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = e.target?.result as string;
                    const section = this.fromJSON(json);
                    resolve(section);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }
}
