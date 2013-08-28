/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

interface FileSystem {
    readonly attribute DOMString      name;
    readonly attribute Directory root;
};

interface Entry {
    readonly  attribute boolean    isFile;
    readonly  attribute boolean    isDirectory;
    void      getMetadata (MetadataCallback successCallback, optional ErrorCallback errorCallback);
    readonly  attribute DOMString  name;
    readonly  attribute DOMString  fullPath;
    readonly  attribute FileSystem filesystem;
//  DOMString toURL ();
    void      remove (VoidCallback successCallback, optional ErrorCallback errorCallback);
    void      getParent (EntryCallback successCallback, optional ErrorCallback errorCallback);
};

interface Directory : Entry {
    void            createFile (DOMString path, optional CreateFileOptions options, optional EntryCallback successCallback, optional ErrorCallback errorCallback);
    void            createDirectory (DOMString name, optional EntryCallback successCallback, optional ErrorCallback errorCallback);
    void            get (DOMString path, optional EntryCallback successCallback, optional ErrorCallback errorCallback);
    void            rename (DOMString oldName, DOMString newName, optional EntryCallback successCallback, optional ErrorCallback errorCallback);
    void            move ((DOMString /*or File*/ or Directory) path, DOMString dest, EntryCallback successCallback, optional ErrorCallback errorCallback);
    void            move ((DOMString /*or File*/ or Directory) path, Directory dest, EntryCallback successCallback, optional ErrorCallback errorCallback);
    void            move ((DOMString /*or File*/ or Directory) path, DestinationDict dest, EntryCallback successCallback, optional ErrorCallback errorCallback);
    void            copy ((DOMString /*or File*/ or Directory) path, DOMString dest, EntryCallback successCallback, optional ErrorCallback errorCallback);
    void            copy ((DOMString /*or File*/ or Directory) path, Directory dest, EntryCallback successCallback, optional ErrorCallback errorCallback);
    void            copy ((DOMString /*or File*/ or Directory) path, DestinationDict dest, EntryCallback successCallback, optional ErrorCallback errorCallback);
    void            remove (DOMString entry, VoidCallback successCallback, optional ErrorCallback errorCallback);
    void            remove (Directory entry, VoidCallback successCallback, optional ErrorCallback errorCallback);
    void            removeDeep (DOMString entry, VoidCallback successCallback, optional ErrorCallback errorCallback);
    void            removeDeep (Directory entry, VoidCallback successCallback, optional ErrorCallback errorCallback);
    void            enumerate (optional DOMString path, optional EntriesCallback successCallback, optional ErrorCallback errorCallback);
    void            enumerateDeep (optional DOMString path, optional EntriesCallback successCallback, optional ErrorCallback errorCallback);
    Promise         getFile (DOMString path, optional FileSystemFlags options);
    void            getDirectory (DOMString path, optional FileSystemFlags options, optional EntryCallback successCallback, optional ErrorCallback errorCallback);
};

interface FileEntry : Entry {
//    [Creator]
//    void createWriter (FileWriterCallback successCallback, optional ErrorCallback errorCallback);
//    void file (FileCallback successCallback, optional ErrorCallback errorCallback);
};

interface Metadata {
    readonly attribute any                modificationTime;
    readonly attribute unsigned long long size;
};

dictionary FileSystemFlags {
    boolean create = false;
    boolean exclusive = false;
};

dictionary CreateFileOptions {
    CreateIfExistsMode ifExists = "fail";
//  (DOMString or Blob or ArrayBuffer or ArrayBufferView) data;
    any data;
};

dictionary DestinationDict {
    Directory dir;
    DOMString name;
};

enum CreateIfExistsMode { "truncate", "fail" };

callback EntryCallback = void (Entry entry);

callback EntriesCallback = void (sequence<Entry> entries);

callback MetadataCallback = void (Metadata metadata);

// callback FileWriterCallback = void (FileWriter fileWriter);

// callback FileCallback = void (File file);

callback VoidCallback = void ();

callback ErrorCallback = void (DOMError err);
