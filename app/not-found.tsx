import React from "react";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Trạng thái KHÔNG KHỚP / KHÔNG TỒN TẠI (mục 13 UI Spec). */
export default function NotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center py-10">
      <div className="max-w-[460px] w-full p-6 rounded-lg border border-border bg-card shadow-xs text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-muted grid place-items-center mx-auto">
          <SearchX className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h1 className="t-page">Không tìm thấy</h1>
          <p className="t-meta">
            Trang hoặc dữ liệu bạn yêu cầu không tồn tại, đã bị xoá, hoặc bạn đã gõ sai đường dẫn.
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Link href="/">
            <Button type="button" variant="default" size="sm">
              Về trang chủ
            </Button>
          </Link>
          <Link href="/conversations">
            <Button type="button" variant="outline" size="sm">
              Xem hội thoại
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
