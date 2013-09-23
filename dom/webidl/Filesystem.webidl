/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

interface Directory {
/*
  readonly attribute DOMString name;

  [Creator, Throws]
  Promise createFile(DOMString path,
                           CreateFileOptions options);
  [Creator, Throws]
  Promise createDirectory(DOMString path);

  [Creator, Throws]
  Promise get(DOMString path);

  [Creator, Throws]
  AbortableProgressPromise
    move((DOMString or File or Directory) path,
         (DOMString or Directory or DestinationDict) dest);

  [Creator, Throws]
  Promise remove((DOMString or File or Directory) path);
  [Creator, Throws]
  Promise removeDeep((DOMString or File or Directory) path);

  [Creator, Throws]
  Promise openRead((DOMString or File) path);
  [Creator, Throws]
  Promise openWrite((DOMString or File) path, OpenWriteOptions options);

  EventStream enumerate(optional DOMString path);
  EventStream enumerateDeep(optional DOMString path);
*/
};

enum StorageType { "temporary", "persistent", "sdcard" };
dictionary FilesystemParameters {
  StorageType storage = "temporary";
};
/*
dictionary CreateFileOptions {
  CreateIfExistsMode ifExists = "fail";
  (DOMString or Blob or ArrayBuffer or ArrayBufferView) data;
};

dictionary OpenWriteOptions {
  OpenIfNotExistsMode ifNotExists = "create";
  OpenIfExistsMode ifExists = "open";
};

enum CreateIfExistsMode { "replace", "fail" };
enum OpenIfExistsMode { "open", "fail" };
enum OpenIfNotExistsMode { "create", "fail" };

dictionary DestinationDict {
  Directory dir;
  DOMString name;
};

enum FileOpenMode { "readonly", "readwrite" };
*/
