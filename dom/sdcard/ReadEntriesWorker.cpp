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

ReadEntriesWorker::ReadEntriesWorker(const nsAString& aRelpath) :
    Worker(aRelpath)
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
  SDCARD_LOG("in ReadEntriesWorker.Work()!");
  SDCARD_LOG("realPath=%s", NS_ConvertUTF16toUTF8(mRelpath).get());
  MOZ_ASSERT(!NS_IsMainThread(), "Never call on main thread!");

  nsresult rv = NS_OK;
  nsCOMPtr<nsISimpleEnumerator> childEnumerator;
  rv = mFile->GetDirectoryEntries(getter_AddRefs(childEnumerator));
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

    if (isDir || isFile) {
      nsString childPath;
      childFile->GetPath(childPath);
      mResultPaths.AppendElement(childPath);
    }
  }
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
