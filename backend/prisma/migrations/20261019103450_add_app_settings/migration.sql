CREATE TABLE "AppSetting" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppSetting_userId_key" ON "AppSetting"("userId");
CREATE INDEX "AppSetting_userId_idx" ON "AppSetting"("userId");
