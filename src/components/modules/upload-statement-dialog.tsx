"use client";

/**
 * Загрузка банковской выписки — перенос окна из прежней версии.
 *
 * Состав полей и подписи взяты как есть: зона перетаскивания с перечнем
 * форматов, владелец счёта, номер, период и комментарий. Файл никуда не
 * уходит — прототип добавляет запись в localStorage со статусом «Обработка…»,
 * как это выглядело и раньше.
 */

import { useRef, useState } from "react";
import { FileUp, Upload } from "lucide-react";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/use-app";

export function UploadStatementDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const db = useApp((s) => s.db);
  const addStatement = useApp((s) => s.addStatement);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [holder, setHolder] = useState("");
  const [account, setAccount] = useState("");
  const [period, setPeriod] = useState("");
  const [comment, setComment] = useState("");

  const reset = () => {
    setFile(null);
    setHolder("");
    setAccount("");
    setPeriod("");
    setComment("");
    setDragging(false);
  };

  const submit = () => {
    addStatement({
      name: file ?? "Выписка.pdf",
      holder: holder || "Не указан",
      account: account || "—",
      period: period || "—",
      comment,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Загрузить выписку</DialogTitle>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          {/* Зона перетаскивания */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) setFile(f.name);
            }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-12 border border-dashed px-6 py-8 text-center transition-colors",
              dragging ? "border-primary bg-accent" : "border-field bg-surface hover:border-primary"
            )}
          >
            <FileUp className={cn("h-7 w-7", dragging ? "text-primary" : "text-icon")} />
            <span className="text-sm font-medium text-foreground">
              {file ?? "Перетащите файл выписки сюда"}
            </span>
            <span className="text-xs text-muted-foreground">
              или нажмите для выбора · PDF, Excel, CSV, DOC (до 50 МБ)
            </span>
            <span className="mt-1 text-xs font-semibold text-primary">Выбрать файл</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            hidden
            accept=".pdf,.xls,.xlsx,.csv,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stmt-holder">Владелец счёта / лицо</Label>
            <Input
              id="stmt-holder"
              list="stmt-holders"
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="Выберите организацию или физлицо…"
            />
            {/* Подсказки из базы: организации и люди, которые уже есть. */}
            <datalist id="stmt-holders">
              {db.companies.map((c) => (
                <option key={c.bin} value={c.name} />
              ))}
              {db.people.map((p) => (
                <option key={p.iin} value={p.fullName} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stmt-account">Номер счёта</Label>
              <Input
                id="stmt-account"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="KZ…"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stmt-period">Период выписки</Label>
              <Input
                id="stmt-period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="дд.мм.гггг — дд.мм.гггг"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stmt-comment">Комментарий</Label>
            <Textarea
              id="stmt-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Необязательно"
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button icon={Upload} onClick={submit}>
            Загрузить и обработать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
