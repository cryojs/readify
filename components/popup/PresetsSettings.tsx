import {Card, CardContent} from "@/components/ui/card"
import {Field, FieldDescription} from "@/components/ui/field"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {TabsContent} from "@/components/ui/tabs"

export function PresetsSettings() {
    return (
        <TabsContent value="presets" className="space-y-4">
            <Card>
                <CardContent className="space-y-2">
                    <Label htmlFor="input-demo-api-key" className="text-xs">
                        AI Settings
                    </Label>
                    <Field>
                        <FieldDescription>
                            Get a free key at "aistudio.google.com/api-keys"
                        </FieldDescription>
                        <Input
                            id="input-demo-api-key"
                            type="password"
                            placeholder="Gemini API key"
                        />
                    </Field>
                </CardContent>
            </Card>
            <p className="text-muted-foreground text-center text-sm">
                presets are a work in progress! coming soon...
            </p>
        </TabsContent>
    )
}
