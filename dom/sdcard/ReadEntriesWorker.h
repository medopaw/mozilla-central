/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "Worker.h"
#include "nsTArray.h"

namespace mozilla {
namespace dom {
namespace sdcard {

class ReadEntriesWorker : public Worker
{
public:
  ReadEntriesWorker(const nsAString& aRelpath, bool aDeep);
  ~ReadEntriesWorker();

  InfallibleTArray<nsString> mResultPaths;

private:
  virtual void Work() MOZ_OVERRIDE;
  bool mDeep;

private:
  void EnumerateInternal(nsCOMPtr<nsIFile> aDir);
  bool AppendToResult(nsCOMPtr<nsIFile> aFile);
};

} // namespace sdcard
} // namespace dom
} // namespace mozilla
