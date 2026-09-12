import {Card, CardContent} from "@/components/ui/card"
import {Field, FieldDescription} from "@/components/ui/field"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {TabsContent} from "@/components/ui/tabs"
import {useEffect, useState} from "react"

import {loadGeminiApiKey, saveGeminiApiKey} from "@/lib/settings-storage"

export function PresetsSettings() {
    const [apiKey, setApiKey] = useState("")

    useEffect(() => {
        let isCancelled = false

        void loadGeminiApiKey()
            .then((storedApiKey) => {
                if (!isCancelled) {
                    setApiKey(storedApiKey)
                }
            })
            .catch((error) => {
                if (!isCancelled) {
                    console.warn("[Readify] Could not load the Gemini API key.", error)
                }
            })

        return () => {
            isCancelled = true
        }
    }, [])

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
                            value={apiKey}
                            onChange={(event) => {
                                const value = event.target.value
                                setApiKey(value)
                                void saveGeminiApiKey(value).catch((error) => {
                                    console.warn("[Readify] Could not save the Gemini API key.", error)
                                })
                            }}
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
