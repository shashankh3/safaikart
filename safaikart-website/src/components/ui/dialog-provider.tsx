import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Input } from "./input";
import { Button } from "./button";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  requireTypeToConfirm?: string;
  destructive?: boolean;
};

type PromptOptions = {
  title: string;
  description?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
};

type DialogContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogContextType | null>(null);

export function useDialogs() {
  const context = useContext(DialogContext);
  if (!context) throw new Error("useDialogs must be used within DialogProvider");
  return context;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const [promptState, setPromptState] = useState<{
    options: PromptOptions;
    resolve: (value: string | null) => void;
  } | null>(null);

  const [confirmInput, setConfirmInput] = useState("");
  const [promptInput, setPromptInput] = useState("");

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmInput("");
      setConfirmState({ options, resolve });
    });
  };

  const prompt = (options: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptInput(options.defaultValue || "");
      setPromptState({ options, resolve });
    });
  };

  const handleConfirmClose = (value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
    }
  };

  const handlePromptClose = (submit: boolean) => {
    if (promptState) {
      promptState.resolve(submit ? promptInput : null);
      setPromptState(null);
    }
  };

  const confirmDisabled =
    confirmState?.options.requireTypeToConfirm != null &&
    confirmInput !== confirmState.options.requireTypeToConfirm;

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}

      <AlertDialog open={!!confirmState} onOpenChange={(open) => !open && handleConfirmClose(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState?.options.title}</AlertDialogTitle>
            {confirmState?.options.description && (
              <AlertDialogDescription>{confirmState.options.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>

          {confirmState?.options.requireTypeToConfirm && (
            <div className="my-4">
              <label className="text-sm text-muted-foreground block mb-2">
                Type <strong>{confirmState.options.requireTypeToConfirm}</strong> to confirm
              </label>
              <Input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={confirmState.options.requireTypeToConfirm}
                autoFocus
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleConfirmClose(false)}>
              {confirmState?.options.cancelText || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleConfirmClose(true)}
              disabled={confirmDisabled}
              className={confirmState?.options.destructive ? "bg-red-600 hover:bg-red-700 focus:ring-red-600" : ""}
            >
              {confirmState?.options.confirmText || "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!promptState} onOpenChange={(open) => !open && handlePromptClose(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{promptState?.options.title}</DialogTitle>
            {promptState?.options.description && (
              <DialogDescription>{promptState.options.description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="my-4">
            <Input
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePromptClose(true);
              }}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handlePromptClose(false)}>
              {promptState?.options.cancelText || "Cancel"}
            </Button>
            <Button onClick={() => handlePromptClose(true)}>
              {promptState?.options.confirmText || "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DialogContext.Provider>
  );
}
