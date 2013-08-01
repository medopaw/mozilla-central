/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ReadEntriesWorker.h"
#include "nsISimpleEnumerator.h"
#include "Entry.h"
#include "nsIFile.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

ReadEntriesWorker::ReadEntriesWorker(const nsAString& aRelpath, bool aDeep) :
    Worker(aRelpath), mDeep(aDeep)
{
  SDCARD_LOG("construct ReadEntriesWorker");
}

ReadEntriesWorker::~ReadEntriesWorker()
{
  SDCARD_LOG("destruct ReadEntriesWorker");
}

void
ReadEntriesWorker::Work()
{
  SDCARD_LOG("in ReadEntriesWorker.Work()");
  SDCARD_LOG("realPath=%s", NS_ConvertUTF16toUTF8(mRelpath).get());
  MOZ_ASSERT(!NS_IsMainThread(), "Never call on main thread!");

  EnumerateInternal(mFile);
}

void
ReadEntriesWorker::EnumerateInternal(nsCOMPtr<nsIFile> aDir)
{
  SDCARD_LOG("in ReadEntriesWorker.EnumerateInternal()");

  nsCOMPtr<nsISimpleEnumerator> childEnumerator;
  nsresult rv = aDir->GetDirectoryEntries(getter_AddRefs(childEnumerator));
  if (NS_FAILED(rv) ) {
    SetError(rv);
    return;
  }

  bool hasElements;
  while (NS_SUCCEEDED(childEnumerator->HasMoreElements(&hasElements))
      && hasElements) {
    nsCOMPtr<nsISupports> child;
    rv = childEnumerator->GetNext(getter_AddRefs(child));
    if (NS_FAILED(rv) ) {
      SetError(rv);
      return;
    }

    nsCOMPtr<nsIFile> childFile = do_QueryInterface(child);
    nsRefPtr<Entry> entry;

    bool isDir;
    rv = childFile->IsDirectory(&isDir);
    if (NS_FAILED(rv) ) {
      SetError(rv);
      return;
    }
    bool isFile;
    rv = childFile->IsFile(&isFile);
    if (NS_FAILED(rv) ) {
      SetError(rv);
      return;
    }

    if (mDeep) {
      if (isDir) {
        EnumerateInternal(childFile);
      } else if (isFile) {
        if (!AppendToResult(childFile)) {
          break;
        }
      }
    } else {
      if (isDir || isFile) {
        if (!AppendToResult(childFile)) {
          break;
        }
      }
    }
  }
}

bool
ReadEntriesWorker::AppendToResult(nsCOMPtr<nsIFile> aFile)
{
  SDCARD_LOG("in ReadEntriesWorker::AppendToResult()");
  nsString path;
  nsresult rv = aFile->GetPath(path);
  if (NS_FAILED(rv) ) {
    SetError(rv);
    return false;
  }
  mResultPaths.AppendElement(path);
  return true;
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
